"""
扫描初始化 Flow

负责编排扫描任务的初始化流程

职责：
- 使用 FlowOrchestrator 解析 YAML 配置
- 在 Prefect Flow 中执行子 Flow（Subflow）
- 按照 YAML 顺序编排工作流
- 根据 scan_mode 创建对应的 Provider
- 不包含具体业务逻辑（由 Tasks 和 FlowOrchestrator 实现）

架构：
- Flow: Prefect 编排层（本文件）
- FlowOrchestrator: 配置解析和执行计划（apps/scan/services/）
- Tasks: 执行层（apps/scan/tasks/）
- Handlers: 状态管理（apps/scan/handlers/）
"""

# Django 环境初始化（导入即生效）
# 注意：动态扫描容器应使用 run_initiate_scan.py 启动，以便在导入前设置环境变量
import apps.common.prefect_django_setup  # noqa: F401

import logging

from prefect import flow, task
from prefect.futures import wait

from apps.scan.handlers import (
    on_initiate_scan_flow_running,
    on_initiate_scan_flow_completed,
    on_initiate_scan_flow_failed,
)
from apps.scan.orchestrators import FlowOrchestrator
from apps.scan.utils import setup_scan_workspace

logger = logging.getLogger(__name__)


@task(name="run_subflow")
def _run_subflow_task(scan_type: str, flow_func, flow_kwargs: dict):
    """包装子 Flow 的 Task，用于在并行阶段并发执行子 Flow。"""
    logger.info("开始执行子 Flow: %s", scan_type)
    return flow_func(**flow_kwargs)


def _create_provider(scan, target_id: int, scan_id: int):
    """根据 scan_mode 创建对应的 Provider"""
    from apps.scan.models import Scan
    from apps.scan.providers import (
        DatabaseTargetProvider,
        SnapshotTargetProvider,
        ProviderContext,
    )

    provider_context = ProviderContext(target_id=target_id, scan_id=scan_id)

    if scan.scan_mode == Scan.ScanMode.QUICK:
        provider = SnapshotTargetProvider(scan_id=scan_id, context=provider_context)
        logger.info("✓ 快速扫描模式 - 创建 SnapshotTargetProvider")
    else:
        provider = DatabaseTargetProvider(target_id=target_id, context=provider_context)
        logger.info("✓ 完整扫描模式 - 使用 DatabaseTargetProvider")

    return provider


def _execute_sequential_flows(valid_flows: list, results: dict, executed_flows: list):
    """顺序执行 Flow 列表"""
    for scan_type, flow_func, flow_kwargs in valid_flows:
        logger.info("=" * 60)
        logger.info("执行 Flow: %s", scan_type)
        logger.info("=" * 60)
        try:
            result = flow_func(**flow_kwargs)
            executed_flows.append(scan_type)
            results[scan_type] = result
            logger.info("✓ %s 执行成功", scan_type)
        except Exception as e:
            logger.warning("%s 执行失败: %s", scan_type, e)
            executed_flows.append(f"{scan_type} (失败)")
            results[scan_type] = {'success': False, 'error': str(e)}


def _execute_parallel_flows(valid_flows: list, results: dict, executed_flows: list):
    """并行执行 Flow 列表"""
    futures = []
    for scan_type, flow_func, flow_kwargs in valid_flows:
        logger.info("=" * 60)
        logger.info("提交并行子 Flow 任务: %s", scan_type)
        logger.info("=" * 60)
        future = _run_subflow_task.submit(
            scan_type=scan_type,
            flow_func=flow_func,
            flow_kwargs=flow_kwargs,
        )
        futures.append((scan_type, future))

    if not futures:
        return

    wait([f for _, f in futures])

    for scan_type, future in futures:
        try:
            result = future.result()
            executed_flows.append(scan_type)
            results[scan_type] = result
            logger.info("✓ %s 执行成功", scan_type)
        except Exception as e:
            logger.warning("%s 执行失败: %s", scan_type, e)
            executed_flows.append(f"{scan_type} (失败)")
            results[scan_type] = {'success': False, 'error': str(e)}


@flow(
    name='initiate_scan',
    description='扫描任务初始化流程',
    log_prints=True,
    on_running=[on_initiate_scan_flow_running],
    on_completion=[on_initiate_scan_flow_completed],
    on_failure=[on_initiate_scan_flow_failed],
)
def initiate_scan_flow(
    scan_id: int,
    target_id: int,
    scan_workspace_dir: str,
    engine_name: str,
    scheduled_scan_name: str | None = None,  # noqa: ARG001
) -> dict:
    """
    初始化扫描任务（动态工作流编排）

    根据 YAML 配置动态编排工作流：
    - 从数据库获取 engine_config (YAML)
    - 检测启用的扫描类型
    - 按照定义的阶段执行：
      Stage 1: Discovery (顺序执行)
        - subdomain_discovery
        - port_scan
        - site_scan
      Stage 2: Analysis (并行执行)
        - url_fetch
        - directory_scan

    Args:
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        scan_workspace_dir: Scan 工作空间目录路径
        engine_name: 引擎名称（用于显示）
        scheduled_scan_name: 定时扫描任务名称（可选，用于通知显示）

    Returns:
        dict: 执行结果摘要

    Raises:
        ValueError: 参数验证失败或配置无效
        RuntimeError: 执行失败
    """
    try:
        # 参数验证
        if not scan_id:
            raise ValueError("scan_id is required")
        if not scan_workspace_dir:
            raise ValueError("scan_workspace_dir is required")
        if not engine_name:
            raise ValueError("engine_name is required")

        # 创建工作空间
        scan_workspace_path = setup_scan_workspace(scan_workspace_dir)

        # 获取引擎配置
        from apps.scan.models import Scan
        scan = Scan.objects.get(id=scan_id)
        engine_config = scan.yaml_configuration

        # 创建 Provider
        provider = _create_provider(scan, target_id, scan_id)

        # 获取 target_name 用于日志显示
        target_name = provider.get_target_name()
        if not target_name:
            raise ValueError("无法获取 Target 名称")

        logger.info("=" * 60)
        logger.info("开始初始化扫描任务")
        logger.info("Scan ID: %s, Target: %s, Engine: %s", scan_id, target_name, engine_name)
        logger.info("Workspace: %s", scan_workspace_dir)
        logger.info("=" * 60)

        # 解析配置，生成执行计划
        orchestrator = FlowOrchestrator(engine_config)
        enabled_tools_by_type = orchestrator.enabled_tools_by_type

        logger.info("执行计划: %s (共 %d 个 Flow)",
                    ' → '.join(orchestrator.scan_types), len(orchestrator.scan_types))

        # 初始化阶段进度
        from apps.scan.services import ScanService
        ScanService().init_stage_progress(scan_id, orchestrator.scan_types)
        logger.info("✓ 初始化阶段进度 - Stages: %s", orchestrator.scan_types)

        # 更新 Target 最后扫描时间
        from apps.targets.services import TargetService
        TargetService().update_last_scanned_at(target_id)
        logger.info("✓ 更新 Target 最后扫描时间 - Target ID: %s", target_id)

        # 执行 Flow
        executed_flows = []
        results = {}
        base_kwargs = {
            'scan_id': scan_id,
            'target_id': target_id,
            'scan_workspace_dir': str(scan_workspace_path)
        }

        def get_valid_flows(flow_names: list) -> list:
            """获取有效的 Flow 函数列表"""
            valid = []
            for scan_type in flow_names:
                flow_func = orchestrator.get_flow_function(scan_type)
                if not flow_func:
                    logger.warning("跳过未实现的 Flow: %s", scan_type)
                    continue
                kwargs = dict(base_kwargs)
                kwargs['enabled_tools'] = enabled_tools_by_type.get(scan_type, {})
                kwargs['provider'] = provider
                valid.append((scan_type, flow_func, kwargs))
            return valid

        # 动态阶段执行
        for mode, enabled_flows in orchestrator.get_execution_stages():
            valid_flows = get_valid_flows(enabled_flows)
            if not valid_flows:
                continue

            logger.info("=" * 60)
            logger.info("%s执行阶段: %s", "顺序" if mode == 'sequential' else "并行",
                        ', '.join(enabled_flows))
            logger.info("=" * 60)

            if mode == 'sequential':
                _execute_sequential_flows(valid_flows, results, executed_flows)
            else:
                _execute_parallel_flows(valid_flows, results, executed_flows)

        logger.info("=" * 60)
        logger.info("✓ 扫描任务初始化完成 - 执行的 Flow: %s", ', '.join(executed_flows))
        logger.info("=" * 60)

        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': str(scan_workspace_path),
            'executed_flows': executed_flows,
            'results': results
        }

    except ValueError as e:
        logger.error("参数错误: %s", e)
        raise
    except RuntimeError as e:
        logger.error("运行时错误: %s", e)
        raise
    except OSError as e:
        logger.error("文件系统错误: %s", e)
        raise
    except Exception as e:
        logger.exception("初始化扫描任务失败: %s", e)
        raise
