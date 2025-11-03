from celery import shared_task
from apps.scan.models import Scan
from apps.engine.models import ScanEngine
from apps.common.definitions import CeleryTaskStatus
from pathlib import Path
from datetime import datetime
import os
import logging
import yaml

logger = logging.getLogger(__name__)


@shared_task(name='initiate_scan', queue='main_scan_queue', bind=True)
def initiate_scan(self, scan_id: int, engine_id: int):
    """
    初始化扫描任务，根据 engine 配置动态调度子任务
    
    Args:
        self: Celery task instance (由 bind=True 提供)
        scan_id: Scan 对象的 ID
        engine_id: 扫描引擎 ID
    """
    try:
        # 获取 Scan 对象和 Engine 配置
        scan = Scan.objects.get(id=scan_id)  # type: ignore  # pylint: disable=no-member
        engine = ScanEngine.objects.get(id=engine_id)  # type: ignore  # pylint: disable=no-member
        
        # 生成时间戳和扫描结果目录
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_dir = os.getenv('SCAN_RESULTS_DIR')
        results_dir = Path(base_dir) / f"task_{timestamp}"
        
        # 创建扫描结果目录
        try:
            results_dir.mkdir(parents=True, exist_ok=True)
            logger.info("创建扫描结果目录: %s", results_dir)
        except OSError as e:
            logger.error("创建目录失败: %s - %s", results_dir, e)
            raise
        
        # 更新 Scan 对象
        scan.results_dir = str(results_dir)
        scan.task_ids = [self.request.id] if self.request.id else []
        scan.task_names = [self.request.task] if self.request.task else []
        scan.status = CeleryTaskStatus.RUNNING
        scan.save()
        
        logger.info(
            "初始化扫描任务 - Scan ID: %s, Target: %s, Engine ID: %s, Task ID: %s, Results Dir: %s",
            scan_id, scan.target.name, engine_id, self.request.id, results_dir
        )
        
        # 解析 engine 配置
        config = _parse_engine_config(engine.configuration)
        
        if not config:
            logger.warning("Engine %s has no configuration, skipping task dispatch", engine_id)
            return
        
        # 根据配置动态调度任务
        _dispatch_tasks(scan, config)
        
        logger.info("任务调度完成 - Scan ID: %s", scan_id)
        
    except Scan.DoesNotExist:  # type: ignore  # pylint: disable=no-member
        logger.error("Scan with ID %s does not exist", scan_id)
        raise
    except ScanEngine.DoesNotExist:  # type: ignore  # pylint: disable=no-member
        logger.error("ScanEngine with ID %s does not exist", engine_id)
        raise
    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to initiate scan: %s", e)
        # 更新 Scan 状态为失败
        try:
            scan = Scan.objects.get(id=scan_id)  # type: ignore  # pylint: disable=no-member
            scan.status = CeleryTaskStatus.FAILED
            scan.error_message = str(e)[:300]
            scan.save()
        except Exception:  # noqa: BLE001
            pass
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


def _dispatch_tasks(scan: Scan, config: dict):
    """
    根据 YAML 配置中的任务类型，匹配预定义的工作流组合
    
    工作流匹配逻辑：
    - 根据配置中出现的顶级任务键（如 subdomain_discovery, port_scan 等）
    - 匹配到对应的预定义工作流组合
    - 直接执行该工作流
    
    Args:
        scan: Scan 对象
        config: 解析后的配置字典
    """
    
    target_domain = scan.target.name
    scan_id = scan.id
    target_id = scan.target.id
    
    # 准备任务参数
    task_kwargs = {
        'scan_id': scan_id,
        'target_id': target_id
    }
    
    # 检测配置中的任务类型（顶级键）
    enabled_tasks = set(config.keys())
    
    logger.info("="*60)
    logger.info("目标域名: %s", target_domain)
    logger.info("检测到的任务类型: %s", enabled_tasks)
    logger.info("="*60)
    
    # 根据任务组合匹配预定义工作流
    workflow, task_names = _match_workflow_by_tasks(enabled_tasks, target_domain, task_kwargs, config)
    
    if not workflow:
        logger.warning("没有匹配到任何工作流，任务类型: %s", enabled_tasks)
        return
    
    logger.info("="*60)
    logger.info("扫描工作流构建完成")
    logger.info("任务总数: %d", len(task_names))
    logger.info("任务列表: %s", ' -> '.join(task_names))
    logger.info("="*60)
    
    # 执行工作流
    result = workflow.apply_async(queue='main_scan_queue')
    
    # 更新 Scan 对象的任务信息
    try:
        _update_scan_task_info(scan, result, task_names)
        logger.info("✓ 工作流已启动，任务 ID: %s", scan.task_ids)
    except Exception as e:  # noqa: BLE001
        logger.error("✗ 更新 Scan 对象失败: %s", e)


def _match_workflow_by_tasks(enabled_tasks: set, target: str, task_kwargs: dict, config: dict):
    """
    根据启用的任务类型集合，匹配预定义的工作流
    
    Args:
        enabled_tasks: 配置中出现的任务类型集合（如 {'subdomain_discovery', 'port_scan'}）
        target: 目标域名
        task_kwargs: 任务参数
        config: 完整配置字典
    
    Returns:
        (workflow, task_names): 工作流对象和任务名称列表
    """
    
    # 仅子域名发现
    if 'subdomain_discovery' in enabled_tasks:
        logger.info("✓ 匹配到工作流: Subdomain Discovery Only")
        return _build_subdomain_only_workflow(target, task_kwargs, config)

    # 没有匹配到任何工作流
    logger.warning("✗ 未匹配到预定义工作流，任务类型: %s", enabled_tasks)
    return None, []


    




def _build_subdomain_only_workflow(target: str, task_kwargs: dict, config: dict):
    """
    构建仅子域名发现工作流
    
    Args:
        target: 目标域名
        task_kwargs: 任务参数
        config: 配置字典
    
    Returns:
        (workflow, task_names): 工作流对象和任务名称列表
    """
    from apps.scan.tasks.subdomain_discovery_task import subdomain_discovery_task
    
    logger.info("构建 Subdomain Only 工作流")
    
    if 'subdomain_discovery' not in config:
        logger.warning("subdomain_discovery 未在配置中")
        return None, []
    
    workflow = subdomain_discovery_task.si(target=target, **task_kwargs)
    task_names = ['subdomain_discovery']
    
    logger.info("✓ subdomain_discovery")
    
    return workflow, task_names




def _update_scan_task_info(scan: Scan, result, task_names: list):
    """
    更新 Scan 对象的任务信息
    
    Args:
        scan: Scan 对象
        result: Celery 任务结果
        task_names: 任务名称列表
    """
    if hasattr(result, 'children') and result.children:
        # GroupResult: 获取所有子任务 ID
        child_ids = []
        for child in result.children:
            if hasattr(child, 'id'):
                child_ids.append(child.id)
            elif hasattr(child, 'children'):
                # 嵌套的 group
                child_ids.extend([c.id for c in child.children if hasattr(c, 'id')])
        
        scan.task_ids.extend(child_ids)
        scan.task_names.extend(task_names)
    elif hasattr(result, 'id'):
        # 单个任务
        scan.task_ids.append(result.id)
        scan.task_names.extend(task_names)
    
    scan.save()