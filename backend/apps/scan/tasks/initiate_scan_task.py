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
def initiate_scan_task(self, scan_id: int = None):
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
        scan_id: Scan 对象的 ID（关键字参数，便于信号处理器统一获取）
    
    Returns:
        dict: {
            'success': bool,
            'scan_id': int,
            'target': str,
            'engine_id': int,
            'workspace_dir': str,  # 工作空间路径
            'expected_tasks': list  # 预期执行的任务名称列表
        }
    
    Raises:
        ValueError: 参数验证失败或配置错误
        RuntimeError: 状态转换失败或工作流构建失败
    """
    try:
        # 参数验证
        if not scan_id:
            raise ValueError("scan_id is required")
        
        # 延迟导入避免循环依赖
        from apps.scan.services import ScanService
        
        # 通过 Service 层获取 Scan 对象
        scan_service = ScanService()
        scan = scan_service.get_scan(scan_id, prefetch_relations=True)
        
        if not scan:
            raise ValueError(f"Scan with ID {scan_id} does not exist")
        
        # 访问关联对象（已预加载，无额外查询）
        engine = scan.engine
        workspace_dir = Path(scan.results_dir)
        
        # 创建扫描工作空间目录
        workspace_dir.mkdir(parents=True, exist_ok=True)
        logger.debug("创建扫描工作空间目录: %s", workspace_dir)
        
        logger.info(
            "初始化扫描任务 - Scan ID: %s, Target: %s, Engine: %s, Task ID: %s, Workspace: %s",
            scan_id, scan.target.name, engine.name, self.request.id, workspace_dir
        )
        
        # 更新扫描状态为 RUNNING
        if not scan_service.update_scan_to_running(scan_id=scan_id):
            raise RuntimeError(f"更新扫描状态失败 - Scan ID: {scan_id}")
        
        logger.debug("Scan 状态已更新为 RUNNING - Scan ID: %s", scan_id)
        
        # 解析 engine 配置
        config = _parse_engine_config(engine.configuration)
        if not config:
            raise ValueError(f"Engine {engine.name} 没有配置，无法启动扫描")
        
        # 使用编排器构建工作流
        orchestrator = WorkflowOrchestrator()
        workflow, expected_tasks = orchestrator.dispatch_workflow(scan, config)
        if not workflow:
            raise RuntimeError(f"工作流构建失败 - Scan ID: {scan_id}")
        
        # 执行工作流
        logger.info("工作流已启动 - Scan ID: %s, 任务: %s", scan_id, ' -> '.join(expected_tasks))
        workflow.apply_async()
        
        # 返回结果
        return {
            'success': True,
            'scan_id': scan_id,
            'target': scan.target.name,
            'engine_id': engine.id,
            'workspace_dir': str(workspace_dir),
            'expected_tasks': expected_tasks
        }
        
    except ValueError as e:
        # 配置错误或参数验证失败
        logger.error("配置错误: %s", e)
        raise
    except RuntimeError as e:
        # 运行时错误（状态转换失败、工作流构建失败）
        logger.error("运行时错误: %s", e)
        raise
    except OSError as e:
        # 文件系统错误（工作空间创建失败）
        logger.error("文件系统错误: %s", e)
        raise
    except Exception as e:  # noqa: BLE001
        # 其他未预期错误
        logger.exception("初始化扫描任务失败: %s", e)
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
