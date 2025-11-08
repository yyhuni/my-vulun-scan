"""
DAG 编排器模块

负责根据配置动态构建 DAG（有向无环图）工作流
使用 Prefect 的原生 Flow 和 Task 实现
"""

import logging
from typing import Dict, List, Tuple, Any, Optional, Set
from collections import deque
from importlib import import_module

from prefect import flow, task
from prefect.futures import wait

from apps.scan.models import Scan

logger = logging.getLogger(__name__)


class DAGOrchestrator:
    """
    DAG 工作流编排器
    
    职责：
    - 解析配置中的任务依赖关系
    - 使用拓扑排序（Kahn 算法）构建执行阶段
    - 动态构建 Prefect Flow workflow
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
    
    def build_scan_flow(self, scan: Scan, config: dict) -> Tuple[Any, list]:
        """
        根据配置动态构建 DAG 工作流（返回 Prefect Flow）
        
        Args:
            scan: Scan 对象
            config: 解析后的配置字典（包含 depends_on 字段）
        
        Returns:
            (flow_func, task_names): Prefect flow 函数和任务名称列表
        
        Raises:
            ValueError: 配置错误（没有可执行任务、循环依赖等）
            RuntimeError: 工作流构建失败
        
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
        logger.debug("="*60)
        logger.debug("开始构建动态 DAG 工作流")
        logger.debug("="*60)
        
        # 1. 构建任务字典（任务名称 -> Task 函数）
        tasks = self._build_tasks(scan, config)
        if not tasks:
            raise ValueError("没有可执行的任务")
        
        # 2. 提取依赖关系
        dependencies = self._extract_dependencies(config, tasks.keys())
        
        # 3. 拓扑排序分组
        stages = self._build_dependency_stages(dependencies, list(tasks.keys()))
        if not stages:
            raise ValueError("拓扑排序失败，可能存在循环依赖")
        
        # 4. 构建任务参数
        task_kwargs = {
            'target': scan.target.name,
            'scan_id': scan.id,
            'target_id': scan.target.id,
            'workspace_dir': scan.results_dir
        }
        
        # 5. 收集任务名称（包含 finalize）
        task_names = []
        for stage in stages:
            task_names.extend(stage)
        task_names.append('finalize_scan')
        
        logger.info("DAG 工作流构建完成 - 任务数: %d, 阶段: %d", len(task_names), len(stages) + 1)
        
        # 打印执行计划
        self._print_execution_plan(stages)
        
        # 6. 创建动态 Flow 函数
        @flow(name=f"scan-workflow-{scan.id}", log_prints=True)
        def scan_workflow():
            """动态生成的扫描工作流"""
            logger.info("开始执行扫描工作流 - Scan ID: %s", scan.id)
            
            # 按阶段执行任务
            for stage_idx, stage_task_names in enumerate(stages, 1):
                logger.info("执行 Stage %d: %s", stage_idx, ', '.join(stage_task_names))
                
                if len(stage_task_names) == 1:
                    # 单个任务：直接执行
                    task_name = stage_task_names[0]
                    task_func = tasks[task_name]
                    task_func(**task_kwargs)
                else:
                    # 多个任务：并行执行
                    futures = []
                    for task_name in stage_task_names:
                        task_func = tasks[task_name]
                        future = task_func.submit(**task_kwargs)
                        futures.append(future)
                    
                    # 等待所有并行任务完成
                    wait(futures)
                    
                    # 检查是否有任务失败
                    for future in futures:
                        if future.state.is_failed():
                            raise RuntimeError(f"任务失败: {future.name}")
            
            # 执行 finalize_scan_task
            from apps.scan.tasks.finalize_scan_task import finalize_scan_task
            logger.info("执行 finalize_scan")
            finalize_scan_task(scan_id=scan.id)
            
            logger.info("扫描工作流完成 - Scan ID: %s", scan.id)
            
            return {
                'success': True,
                'scan_id': scan.id,
                'target': scan.target.name,
                'workspace_dir': str(scan.results_dir),
                'executed_tasks': task_names
            }
        
        return scan_workflow, task_names
    
    def _build_tasks(self, scan: Scan, config: dict) -> Dict[str, Any]:
        """
        构建任务函数字典
        
        Args:
            scan: Scan 对象
            config: 配置字典
        
        Returns:
            {task_name: prefect_task_function}
        """
        tasks = {}
        
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
                
                tasks[task_name] = task_func
                logger.debug("✓ 添加任务: %s", task_name)
                
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
        task_names: List[str]
    ) -> List[List[str]]:
        """
        使用拓扑排序（Kahn 算法）将任务按依赖层级分组
        
        Args:
            dependencies: 依赖关系字典 {task: [dep1, dep2, ...]}
            task_names: 任务名称列表
        
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
        in_degree = {task: 0 for task in task_names}
        
        for task, deps in dependencies.items():
            in_degree[task] = len(deps)
        
        # 2. 初始化：找到所有入度为 0 的任务
        queue = deque([task for task, degree in in_degree.items() if degree == 0])
        
        if not queue:
            raise ValueError("没有入度为 0 的任务，可能存在循环依赖")
        
        stages = []
        processed_count = 0
        
        # 3. BFS 遍历
        while queue:
            # 当前层所有入度为 0 的任务（可以并行执行）
            current_stage_names = list(queue)
            stages.append(current_stage_names)
            
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
        if processed_count != len(task_names):
            raise ValueError(
                f"拓扑排序未完成，处理了 {processed_count}/{len(task_names)} 任务，可能存在循环依赖"
            )
        
        return stages
    
    def _print_execution_plan(self, stages: List[List[str]]) -> None:
        """
        打印执行计划（树状结构）
        
        Args:
            stages: 任务阶段列表
        """
        logger.debug("="*60)
        logger.debug("执行计划:")
        logger.debug("="*60)
        for i, stage in enumerate(stages, 1):
            if len(stage) == 1:
                logger.debug("  Stage %d: %s", i, stage[0])
            else:
                task_list = ' ∥ '.join(stage)
                logger.debug("  Stage %d: %s (并行)", i, task_list)
        logger.debug("  Stage %d: finalize_scan", len(stages) + 1)
        logger.debug("="*60)


# 导出接口
__all__ = ['DAGOrchestrator']
