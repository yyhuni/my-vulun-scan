"""
子域名发现扫描 Flow

负责执行子域名发现扫描的完整流程
"""

from prefect import flow
import logging
import yaml

logger = logging.getLogger(__name__)


@flow(name="subdomain_discovery", log_prints=True)
def subdomain_discovery_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    workspace_dir: str,
    engine_config: str
) -> dict:
    """
    子域名发现扫描流程
    
    Args:
        scan_id: 扫描任务 ID
        target_name: 目标名称（域名）
        target_id: 目标 ID
        workspace_dir: 工作空间目录
        engine_config: 引擎配置（YAML 格式字符串，作为参数传递）
    
    Returns:
        dict: {
            'success': bool,
            'scan_id': int,
            'target': str,
            'workspace_dir': str,
            'executed_tasks': list
        }
    
    Raises:
        ValueError: 配置错误
        RuntimeError: 执行失败
    """
    try:
        logger.info(
            "="*60 + "\n" +
            "开始子域名发现扫描\n" +
            f"  Scan ID: {scan_id}\n" +
            f"  Target: {target_name}\n" +
            f"  Workspace: {workspace_dir}\n" +
            "="*60
        )
        
        # 解析配置（作为参数传递）
        config = {}
        if engine_config and engine_config.strip():
            try:
                config = yaml.safe_load(engine_config)
            except yaml.YAMLError as e:
                logger.warning("配置解析失败，使用默认配置: %s", e)
                config = {}
        
        # ==================== 执行子域名发现任务 ====================
        from apps.scan.tasks.subdomain_discovery_task import subdomain_discovery_task
        
        subdomain_discovery_task(
            scan_id=scan_id,
            target_name=target_name,
            target_id=target_id,
            workspace_dir=workspace_dir
        )
        
        logger.info("="*60 + "\n✓ 子域名发现扫描完成\n" + "="*60)
        
        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'workspace_dir': workspace_dir,
            'executed_tasks': ['subdomain_discovery']
        }
        
    except ValueError as e:
        logger.error("配置错误: %s", e)
        raise
    except RuntimeError as e:
        logger.error("运行时错误: %s", e)
        raise
    except Exception as e:
        logger.exception("子域名发现扫描失败: %s", e)
        raise
