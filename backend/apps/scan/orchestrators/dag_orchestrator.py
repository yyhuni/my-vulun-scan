"""
DAG 编排器模块

负责根据配置动态构建 DAG（有向无环图）工作流
"""

import logging
from typing import Dict, List, Tuple, Any, Optional, Set
from collections import deque
from importlib import import_module

from celery import chain, group

from apps.scan.models import Scan

logger = logging.getLogger(__name__)


class DAGOrchestrator:
    """
    DAG 工作流编排器
    
    职责：
    - 解析配置中的任务依赖关系
    - 使用拓扑排序（Kahn 算法）构建执行阶段
    - 动态构建 Celery Canvas workflow
    - 自动在工作流末尾添加 finalize_scan_task
    """
    
    # 任务注册表：任务名称 -> 模块路径
    TASK_REGISTRY = {
        'subdomain_discovery': 'apps.scan.tasks.subdomain_discovery_task.subdomain_discovery_task',
        # 未来扩展: 
        # 'port_scan': 'apps.scan.tasks.port_scan_task.port_scan_task',
        # 'tech_stack': 'apps.scan.tasks.tech_stack_task.tech_stack_task',
        # 'vuln_scan': 'apps.scan.tasks.vuln_scan_task.vuln_scan_task',
    }
    
    def dispatch_workflow(self, scan: Scan, config: dict) -> Tuple[Optional[Any], list]:
        """
        根据配置动态构建 DAG 工作流
        
        Args:
            scan: Scan 对象
            config: 解析后的配置字典（包含 depends_on 字段）
        
        Returns:
            (workflow, task_names): Celery workflow 对象和任务名称列表
            如果构建失败，返回 (None, [])
        
        示例配置：
            {
                'subdomain_discovery': {
                    'enabled': True,
                    'depends_on': [],
                    'config': {...}
                },
                'port_scan': {
                    'enabled': True,
                    'depends_on': ['subdomain_discovery'],
                    'config': {...}
                }
            }
        """
        logger.info("="*60)
        logger.info("开始构建动态 DAG 工作流")
        logger.info("="*60)
        
        # 1. 构建任务字典（任务名称 -> Celery 签名）
        tasks = self._build_tasks(scan, config)
        
        if not tasks:
            logger.warning("没有可执行的任务")
            return None, []
        
        # 2. 提取依赖关系
        dependencies = self._extract_dependencies(config, tasks.keys())
        
        # 3. 拓扑排序分组
        stages = self._build_dependency_stages(dependencies, tasks)
        
        if not stages:
            logger.error("拓扑排序失败，可能存在循环依赖")
            return None, []
        
        # 4. 构建 workflow
        workflow = self._build_workflow(stages, scan.id)
        
        if not workflow:
            logger.error("构建 workflow 失败")
            return None, []
        
        # 5. 收集任务名称（包含 finalize）
        task_names = []
        for stage in stages:
            for task_sig in stage:
                task_names.append(task_sig.task)
        task_names.append('finalize_scan')
        
        logger.info("="*60)
        logger.info("DAG 工作流构建完成")
        logger.info("总任务数: %d", len(task_names))
        logger.info("执行阶段: %d", len(stages) + 1)  # +1 for finalize
        
        # 打印执行计划
        for i, stage in enumerate(stages, 1):
            if len(stage) == 1:
                logger.info("  Stage %d: %s", i, stage[0].task)
            else:
                task_list = ' ∥ '.join([sig.task for sig in stage])
                logger.info("  Stage %d: %s (并行)", i, task_list)
        logger.info("  Stage %d: finalize_scan", len(stages) + 1)
        logger.info("="*60)
        
        return workflow, task_names
    
    def _build_tasks(self, scan: Scan, config: dict) -> Dict[str, Any]:
        """
        构建任务签名字典
        
        Args:
            scan: Scan 对象
            config: 配置字典
        
        Returns:
            {task_name: celery_signature}
        """
        tasks = {}
        
        # 准备任务参数
        task_kwargs = {
            'target': scan.target.name,
            'scan_id': scan.id,
            'target_id': scan.target.id,
            'workspace_dir': scan.results_dir
        }
        
        for task_name, task_config in config.items():
            # 检查任务是否启用
            if not task_config.get('enabled', True):
                logger.debug("任务 %s 未启用，跳过", task_name)
                continue
            
            # 检查任务是否在注册表中
            if task_name not in self.TASK_REGISTRY:
                logger.warning("任务 %s 未在注册表中，跳过", task_name)
                continue
            
            # 动态加载任务
            try:
                task_func = self._load_task(task_name)
                if not task_func:
                    logger.warning("任务 %s 加载失败，跳过", task_name)
                    continue
                
                # 创建不可变签名（使用 si）
                task_sig = task_func.si(**task_kwargs)
                tasks[task_name] = task_sig
                
                logger.info("✓ 添加任务: %s", task_name)
                
            except Exception as e:
                logger.exception("加载任务 %s 失败: %s", task_name, e)
                continue
        
        return tasks
    
    def _load_task(self, task_name: str) -> Optional[Any]:
        """
        动态加载任务函数
        
        Args:
            task_name: 任务名称
        
        Returns:
            任务函数对象，如果加载失败返回 None
        """
        module_path = self.TASK_REGISTRY.get(task_name)
        if not module_path:
            return None
        
        try:
            # 分割模块路径和函数名
            module_name, func_name = module_path.rsplit('.', 1)
            
            # 动态导入模块
            module = import_module(module_name)
            
            # 获取任务函数
            task_func = getattr(module, func_name)
            
            return task_func
            
        except Exception as e:
            logger.exception("动态加载任务失败 - %s: %s", task_name, e)
            return None
    
    def _extract_dependencies(
        self, 
        config: dict, 
        task_keys: Set[str]
    ) -> Dict[str, List[str]]:
        """
        提取依赖关系
        
        Args:
            config: 配置字典
            task_keys: 实际存在的任务名称集合
        
        Returns:
            {task_name: [dependency1, dependency2, ...]}
        """
        dependencies = {}
        
        for task_name in task_keys:
            task_config = config.get(task_name, {})
            depends_on = task_config.get('depends_on', [])
            
            # 过滤掉不存在的依赖
            valid_deps = [dep for dep in depends_on if dep in task_keys]
            
            if len(valid_deps) != len(depends_on):
                invalid_deps = set(depends_on) - set(valid_deps)
                logger.warning(
                    "任务 %s 的依赖 %s 不存在，已忽略",
                    task_name,
                    invalid_deps
                )
            
            dependencies[task_name] = valid_deps
        
        return dependencies
    
    def _build_dependency_stages(
        self,
        dependencies: Dict[str, List[str]],
        tasks: Dict[str, Any]
    ) -> List[List[Any]]:
        """
        使用拓扑排序（Kahn 算法）将任务按依赖层级分组
        
        Args:
            dependencies: 依赖关系字典 {task: [dep1, dep2, ...]}
            tasks: 任务签名字典 {task_name: celery_signature}
        
        Returns:
            [[stage1_tasks], [stage2_tasks], ...] 
            每个阶段的任务可以并行执行
            
        算法说明：
            1. 计算每个任务的入度（被依赖的次数）
            2. 将入度为0的任务加入队列（第一阶段）
            3. 处理当前阶段所有任务，更新其他任务的入度
            4. 重复直到所有任务处理完
        """
        # 1. 计算入度
        in_degree = {task: 0 for task in tasks.keys()}
        
        for task, deps in dependencies.items():
            in_degree[task] = len(deps)
        
        # 2. 初始化：找到所有入度为 0 的任务
        queue = deque([task for task, degree in in_degree.items() if degree == 0])
        
        if not queue:
            logger.error("没有入度为 0 的任务，可能存在循环依赖")
            return []
        
        stages = []
        processed_count = 0
        
        # 3. BFS 遍历
        while queue:
            # 当前层所有入度为 0 的任务（可以并行执行）
            current_stage_names = list(queue)
            current_stage_sigs = [tasks[name] for name in current_stage_names]
            stages.append(current_stage_sigs)
            
            processed_count += len(current_stage_names)
            
            logger.debug(
                "Stage %d: %s (%d tasks)",
                len(stages),
                ', '.join(current_stage_names),
                len(current_stage_names)
            )
            
            # 清空队列，准备下一层
            queue.clear()
            
            # 更新入度：移除当前层任务后，找到新的入度为 0 的任务
            for task_name in current_stage_names:
                # 找到所有依赖当前任务的任务
                for other_task, deps in dependencies.items():
                    if task_name in deps:
                        in_degree[other_task] -= 1
                        if in_degree[other_task] == 0:
                            queue.append(other_task)
        
        # 4. 检查是否所有任务都被处理（检测循环依赖）
        if processed_count != len(tasks):
            logger.error(
                "拓扑排序未完成，处理了 %d/%d 任务，可能存在循环依赖",
                processed_count,
                len(tasks)
            )
            return []
        
        return stages
    
    def _build_workflow(self, stages: List[List[Any]], scan_id: int) -> Optional[Any]:
        """
        构建 Celery Canvas workflow
        
        Args:
            stages: 任务阶段列表
            scan_id: 扫描 ID
        
        Returns:
            Celery workflow 对象（chain）
        
        结构：
            - 单个任务的阶段：直接使用签名
            - 多个任务的阶段：使用 group 包装（并行执行）
            - 所有阶段：使用 chain 串联
            - 最后添加 finalize_scan_task
        """
        if not stages:
            return None
        
        try:
            # 动态加载 finalize_scan_task
            from apps.scan.tasks.finalize_scan_task import finalize_scan_task
            
            # 构建阶段列表
            stage_workflows = []
            
            for stage in stages:
                if len(stage) == 1:
                    # 单个任务：直接使用
                    stage_workflows.append(stage[0])
                else:
                    # 多个任务：使用 group 并行执行
                    stage_workflows.append(group(*stage))
            
            # 添加 finalize_scan_task（使用 si 不接收参数）
            finalize_sig = finalize_scan_task.si(scan_id=scan_id)
            stage_workflows.append(finalize_sig)
            
            # 使用 chain 串联所有阶段
            workflow = chain(*stage_workflows)
            
            return workflow
            
        except Exception as e:
            logger.exception("构建 workflow 失败: %s", e)
            return None


# 导出接口
__all__ = ['DAGOrchestrator']

