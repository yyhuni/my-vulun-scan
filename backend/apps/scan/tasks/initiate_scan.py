"""
扫描任务初始化模块

负责初始化扫描任务，根据 engine 配置调度工作流
"""

from celery import shared_task
from apps.scan.models import Scan
from apps.engine.models import ScanEngine
from apps.scan.orchestrators import WorkflowOrchestrator
from pathlib import Path
from datetime import datetime
import os
import logging
import yaml

logger = logging.getLogger(__name__)


@shared_task(name='initiate_scan', queue='main_scan_queue', bind=True)
def initiate_scan(self, scan_id: int, engine_id: int):
    """
    初始化扫描任务，根据 engine 配置动态编排和执行工作流
    
    职责：
    - 创建扫描工作空间目录（scan_{scan_id}_{timestamp}）
    - 立即保存工作空间路径到数据库（Scan.results_dir）
    - 解析引擎配置
    - 使用 Orchestrator 构建工作流
    - 执行工作流（决定执行时机和方式）
    
    不负责：
    - 更新任务状态（由信号处理器负责）
    - 创建 ScanTask 记录（由信号处理器负责）
    - 构建工作流逻辑（由 WorkflowOrchestrator 负责）
    
    职责分离：
    - WorkflowOrchestrator: 编排工作流（匹配模式、构建 workflow 对象）
    - initiate_scan: 执行工作流（决定何时执行、如何执行）
    
    目录结构：
    - 工作空间：{SCAN_RESULTS_DIR}/scan_{scan_id}_{timestamp}/
    - 子任务在工作空间下创建各自的模块目录，如：
      - subdomain_discovery/
      - port_scan/
      - vulnerability_scan/
    
    Args:
        self: Celery task instance (由 bind=True 提供)
        scan_id: Scan 对象的 ID
        engine_id: 扫描引擎 ID
    
    Returns:
        dict: {
            'success': bool,
            'scan_id': int,
            'timestamp': str,
            'target': str,
            'engine_id': int,
            'task_count': int,  # 工作流中的任务数量
            'task_names': list  # 任务名称列表
        }
    """
    try:
        # 获取 Scan 对象和 Engine 配置
        scan = Scan.objects.get(id=scan_id)  # type: ignore  # pylint: disable=no-member
        engine = ScanEngine.objects.get(id=engine_id)  # type: ignore  # pylint: disable=no-member
        
        # 生成时间戳和扫描工作空间目录
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_dir = os.getenv('SCAN_RESULTS_DIR')
        workspace_dir = Path(base_dir) / f"scan_{scan_id}_{timestamp}"
        
        # 创建扫描工作空间目录
        # 子任务将在此目录下创建各自的模块目录（如 subdomain_discovery/）
        try:
            workspace_dir.mkdir(parents=True, exist_ok=True)
            logger.info("创建扫描工作空间目录: %s", workspace_dir)
        except OSError as e:
            logger.error("创建工作空间目录失败: %s - %s", workspace_dir, e)
            raise
        
        # 立即保存工作空间路径到数据库
        # 避免后续子任务重复更新，确保单一数据源
        scan.results_dir = str(workspace_dir)
        scan.save()
        logger.info("工作空间路径已保存到数据库 - Scan ID: %s", scan_id)
        
        logger.info(
            "初始化扫描任务 - Scan ID: %s, Target: %s, Engine ID: %s, Task ID: %s, Workspace: %s",
            scan_id, scan.target.name, engine_id, self.request.id, workspace_dir
        )
        
        # 解析 engine 配置
        config = _parse_engine_config(engine.configuration)
        
        if not config:
            logger.warning("Engine %s 没有配置，跳过任务调度", engine_id)
            return {
                'success': False,
                'scan_id': scan_id,
                'timestamp': timestamp,
                'message': 'No engine configuration found'
            }
        
        # 使用编排器构建工作流
        orchestrator = WorkflowOrchestrator()
        workflow, task_names = orchestrator.dispatch_workflow(scan, config)
        
        if not workflow:
            logger.warning("工作流构建失败 - Scan ID: %s", scan_id)
            return {
                'success': False,
                'scan_id': scan_id,
                'timestamp': timestamp,
                'target': scan.target.name,
                'engine_id': engine_id,
                'message': 'Failed to build workflow'
            }
        
        # 执行工作流
        logger.info("开始执行工作流 - Scan ID: %s, 任务数: %d", scan_id, len(task_names))
        workflow.apply_async(queue='main_scan_queue')
        
        # 注意：任务信息的更新由 StatusUpdateHandler 通过 task_prerun 信号统一处理
        # 每个任务真正开始执行时会自动追加 task_id 和 task_name
        logger.info("✓ 工作流已启动 - Scan ID: %s, 任务: %s", scan_id, ' -> '.join(task_names))
        
        # 返回结果
        # 注意：results_dir 已在创建时保存到数据库，不需要再返回
        return {
            'success': True,
            'scan_id': scan_id,
            'timestamp': timestamp,
            'target': scan.target.name,
            'engine_id': engine_id,
            'task_count': len(task_names),
            'task_names': task_names
        }
        
    except Scan.DoesNotExist:  # type: ignore  # pylint: disable=no-member
        logger.error("Scan with ID %s does not exist", scan_id)
        raise
    except ScanEngine.DoesNotExist:  # type: ignore  # pylint: disable=no-member
        logger.error("ScanEngine with ID %s does not exist", engine_id)
        raise
    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to initiate scan: %s", e)
        # 注意：失败状态更新由 StatusUpdateHandler 通过 task_failure 信号处理
        raise


def _parse_engine_config(config_text: str) -> dict:
    """
    解析 engine 的 YAML 配置
    
    Args:
        config_text: YAML 格式的配置文本
    
    Returns:
        解析后的配置字典
    """
    if not config_text or not config_text.strip():
        return {}
    
    try:
        config = yaml.safe_load(config_text)
        return config if config else {}
    except yaml.YAMLError as e:
        logger.error("Failed to parse engine configuration: %s", e)
        return {}
