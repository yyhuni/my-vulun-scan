"""
扫描初始化 Flow

负责编排扫描任务的初始化流程

职责：
- 使用 FlowOrchestrator 解析 YAML 配置
- 在 Prefect Flow 中执行子 Flow（Subflow）
- 按照 YAML 顺序编排工作流
- 不包含具体业务逻辑（由 Tasks 和 FlowOrchestrator 实现）

架构：
- Flow: Prefect 编排层（本文件）
- FlowOrchestrator: 配置解析和执行计划（apps/scan/services/）
- Tasks: 执行层（apps/scan/tasks/）
- Handlers: 状态管理（apps/scan/handlers/）
"""

from prefect import flow
from pathlib import Path
import logging

from apps.scan.handlers import (
    on_initiate_scan_flow_running,
    on_initiate_scan_flow_completed,
    on_initiate_scan_flow_failed,
    on_initiate_scan_flow_cancelled,
    on_initiate_scan_flow_crashed
)
from apps.scan.tasks.workspace_tasks import create_scan_workspace_task
from apps.scan.orchestrators import FlowOrchestrator

logger = logging.getLogger(__name__)




@flow(
    name='initiate_scan',
    description='扫描任务初始化流程',
    log_prints=True,
    on_running=[on_initiate_scan_flow_running],
    on_completion=[on_initiate_scan_flow_completed],
    on_failure=[on_initiate_scan_flow_failed],
    on_cancellation=[on_initiate_scan_flow_cancelled],
    on_crashed=[on_initiate_scan_flow_crashed]
)
def initiate_scan_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    engine_name: str,
    engine_config: str
) -> dict:
    """
    初始化扫描任务（动态工作流编排）
    
    根据 YAML 配置动态编排工作流：
    - 解析 engine_config (YAML)
    - 检测配置中的扫描类型（subdomain_discovery, port_scan, site_scan, directory_scan）
    - 按照 YAML 中的顺序依次执行对应的 Flow
    - 每个 Flow 独立执行，不传递数据
    
    示例 YAML：
    ```yaml
    subdomain_discovery:
      tools:
        subfinder:
          enabled: true
    
    port_scan:
      tools:
        naabu:
          enabled: true
    
    site_scan:
      tools:
        httpx:
          enabled: true
    ```
    
    将依次执行：subdomain_discovery_flow → port_scan_flow → site_scan_flow
    
    Args:
        scan_id: 扫描任务 ID
        target_name: 目标名称
        target_id: 目标 ID
        scan_workspace_dir: Scan 工作空间目录路径
        engine_name: 引擎名称（用于显示）
        engine_config: 引擎配置（YAML 格式字符串）
    
    Returns:
        dict: {
            'success': bool,
            'scan_id': int,
            'target': str,
            'scan_workspace_dir': str,
            'executed_flows': list,
            'results': dict
        }
    
    Raises:
        ValueError: 参数验证失败或配置无效
        RuntimeError: 执行失败
    """
    try:
        # ==================== 参数验证 ====================
        if not scan_id:
            raise ValueError("scan_id is required")
        if not scan_workspace_dir:
            raise ValueError("scan_workspace_dir is required")
        if not engine_name:
            raise ValueError("engine_name is required")
        
        
        logger.info(
            "="*60 + "\n" +
            "开始初始化扫描任务\n" +
            f"  Scan ID: {scan_id}\n" +
            f"  Target: {target_name}\n" +
            f"  Engine: {engine_name}\n" +
            f"  Workspace: {scan_workspace_dir}\n" +
            "="*60
        )
        
        # ==================== Task 1: 创建 Scan 工作空间 ====================
        scan_workspace_path = create_scan_workspace_task(scan_workspace_dir)
        
        # ==================== Task 2: 解析配置，生成执行计划 ====================
        orchestrator = FlowOrchestrator(engine_config)
        
        logger.info(
            f"执行计划生成成功：\n"
            f"  扫描类型: {' → '.join(orchestrator.scan_types)}\n"
            f"  总共 {len(orchestrator.scan_types)} 个 Flow"
        )
        
        # 验证配置
        validation = orchestrator.validate()
        if validation['warnings']:
            for warning in validation['warnings']:
                logger.warning(f"⚠️  {warning}")
        
        # ==================== Task 3: 执行 Flow（按 YAML 顺序，Subflow 方式） ====================
        executed_flows = []
        results = {}
        
        for scan_type, flow_func in orchestrator.iter_flows():
            logger.info(f"\n{'='*60}\n执行 Flow: {scan_type}\n{'='*60}")
            
            if not flow_func:
                logger.warning(f"跳过未实现的 Flow: {scan_type}")
                continue
            
            # 在 @flow 中执行子 @flow（Subflow）
            try:
                flow_result = flow_func(
                    scan_id=scan_id,
                    target_name=target_name,
                    target_id=target_id,
                    scan_workspace_dir=str(scan_workspace_path),
                    engine_config=engine_config
                )
                
                executed_flows.append(scan_type)
                results[scan_type] = flow_result
                logger.info(f"✓ {scan_type} 执行成功")
                
            except Exception as e:
                # 任何 Flow 失败都中止整个扫描流程
                error_msg = f"{scan_type} 执行失败，中止扫描流程: {str(e)}"
                logger.error(error_msg)
                executed_flows.append(f"{scan_type} (失败)")
                results[scan_type] = {'success': False, 'error': str(e)}
                raise RuntimeError(error_msg) from e
        
        # ==================== 完成 ====================
        logger.info(
            "="*60 + "\n" +
            "✓ 扫描任务初始化完成\n" +
            f"  执行的 Flow: {', '.join(executed_flows)}\n" +
            "="*60
        )
        
        # ==================== 返回结果 ====================
        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': str(scan_workspace_path),
            'executed_flows': executed_flows,
            'results': results
        }
        
    except ValueError as e:
        # 参数错误
        logger.error("参数错误: %s", e)
        raise
    except RuntimeError as e:
        # 执行失败
        logger.error("运行时错误: %s", e)
        raise
    except OSError as e:
        # 文件系统错误（工作空间创建失败）
        logger.error("文件系统错误: %s", e)
        raise
    except Exception as e:
        # 其他未预期错误
        logger.exception("初始化扫描任务失败: %s", e)
        # 注意：失败状态更新由 Prefect State Handlers 自动处理
        raise
