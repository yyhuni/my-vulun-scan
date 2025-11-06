"""
扫描任务初始化模块

负责初始化扫描任务，根据 engine 配置调度工作流

队列策略：
- 使用 orchestrator 队列（轻量级、高并发）
- 特点：CPU 密集型、执行快（<1秒）
- Worker 配置建议：高并发（-c 50）
"""

from celery import shared_task
from apps.scan.orchestrators import WorkflowOrchestrator
from pathlib import Path
import logging
import yaml

logger = logging.getLogger(__name__)


@shared_task(name='initiate_scan', bind=True)
def initiate_scan_task(self, scan_id: int):
    """
    初始化扫描任务，根据 engine 配置动态编排和执行工作流
    
    职责：
    - 创建扫描工作空间目录（从 scan.results_dir 读取路径）
    - 解析引擎配置
    - 使用 Orchestrator 构建工作流
    - 执行工作流（决定何时执行、如何执行）
    
    不负责：
    - 生成工作空间路径（由 Service 层负责）
    - 更新任务状态（由信号处理器负责）
    - 创建 ScanTask 记录（由信号处理器负责）
    - 构建工作流逻辑（由 WorkflowOrchestrator 负责）
    
    职责分离：
    - Service 层: 生成工作空间路径字符串
    - Task 层: 创建实际目录
    - WorkflowOrchestrator: 编排工作流（匹配模式、构建 workflow 对象）
    - initiate_scan_task: 执行工作流（决定何时执行、如何执行）
    
    目录结构：
    - 工作空间：{SCAN_RESULTS_DIR}/scan_{timestamp}/
    - 子任务在工作空间下创建各自的模块目录，如：
      - subdomain_discovery/
      - port_scan/
      - vulnerability_scan/
    
    Args:
        self: Celery task instance (由 bind=True 提供)
        scan_id: Scan 对象的 ID
    
    Returns:
        dict: {
            'success': bool,
            'scan_id': int,
            'target': str,
            'engine_id': int,
            'workspace': str,  # 工作空间路径
            'task_count': int,  # 工作流中的任务数量
            'task_names': list  # 任务名称列表
        }
    """
    try:
        # 延迟导入避免循环依赖
        from apps.scan.services import ScanService
        
        # 通过 Service 层获取 Scan 对象
        scan = ScanService().get_scan(scan_id, prefetch_relations=True)
        
        if not scan:
            logger.error("Scan with ID %s does not exist", scan_id)
            raise ValueError(f"Scan with ID {scan_id} does not exist")
        
        # 访问关联对象（已预加载，无额外查询）
        engine = scan.engine
        
        # 从数据库读取工作空间路径（由 Service 层生成）
        workspace_dir = Path(scan.results_dir)
        
        # 创建扫描工作空间目录
        # 职责：Task 层负责执行具体操作（创建实际目录）
        # 子任务将在此目录下创建各自的模块目录（如 subdomain_discovery/）
        try:
            workspace_dir.mkdir(parents=True, exist_ok=True)
            logger.info("创建扫描工作空间目录: %s", workspace_dir)
        except OSError as e:
            logger.error("创建工作空间目录失败: %s - %s", workspace_dir, e)
            raise
        
        logger.info(
            "初始化扫描任务 - Scan ID: %s, Target: %s, Engine: %s, Task ID: %s, Workspace: %s",
            scan_id, scan.target.name, engine.name, self.request.id, workspace_dir
        )
        
        # 显式更新 Scan 状态和任务信息（编排任务职责）
        # 注意：这是编排任务，应该显式控制 Scan 状态
        # 工作任务（如 subdomain_discovery）则通过信号隐式处理
        from apps.common.definitions import ScanTaskStatus
        from django.utils import timezone as tz
        from apps.scan.repositories import ScanRepository
        
        # 更新 Scan 状态为 RUNNING 并追加任务信息
        if scan.status == ScanTaskStatus.INITIATED:
            # 首次启动：更新状态并设置开始时间
            scan_repo = ScanRepository()
            scan_repo.start_scan(
                scan_id=scan_id,
                status=ScanTaskStatus.RUNNING,
                task_id=self.request.id,
                task_name='initiate_scan',
                started_at=tz.now()
            )
            logger.info("✓ Scan 状态已更新为 RUNNING - Scan ID: %s", scan_id)
        else:
            # 已经是 RUNNING 状态（理论上不应该发生）
            logger.warning("Scan 已经是 RUNNING 状态，跳过更新 - Scan ID: %s", scan_id)
        
        # 解析 engine 配置
        config = _parse_engine_config(engine.configuration)
        
        if not config:
            logger.warning("Engine %s 没有配置，跳过任务调度", engine.name)
            return {
                'success': False,
                'scan_id': scan_id,
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
                'target': scan.target.name,
                'engine_id': engine.id,
                'message': 'Failed to build workflow'
            }
        
        # 执行工作流
        logger.info("开始执行工作流 - Scan ID: %s, 任务数: %d", scan_id, len(task_names))
        workflow.apply_async()
        
        # 注意：任务信息的更新由 StatusUpdateHandler 通过 task_prerun 信号统一处理
        # 每个任务真正开始执行时会自动追加 task_id 和 task_name
        logger.info("✓ 工作流已启动 - Scan ID: %s, 任务: %s", scan_id, ' -> '.join(task_names))
        
        # 返回结果
        return {
            'success': True,
            'scan_id': scan_id,
            'target': scan.target.name,
            'engine_id': engine.id,
            'workspace': str(workspace_dir),
            'task_count': len(task_names),
            'task_names': task_names
        }
        
    except ValueError as e:
        logger.error("Scan error: %s", e)
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
