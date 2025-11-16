"""
子域名发现扫描 Flow

负责编排子域名发现扫描的完整流程

架构：
- Flow 负责编排多个原子 Task
- 支持并行执行扫描工具
- 每个 Task 可独立重试
"""

from prefect import flow
from pathlib import Path
import logging
import os
from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_running,
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_cancelled,
    on_scan_flow_crashed
)
from apps.scan.utils import config_parser, build_scan_command
from apps.common.normalizer import normalize_domain
from apps.common.validators import validate_domain
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


def _validate_and_normalize_target(target_name: str) -> str:
    """
    验证并规范化目标域名
    
    Args:
        target_name: 原始目标域名
        
    Returns:
        str: 规范化后的域名
        
    Raises:
        ValueError: 域名无效时抛出异常
        
    Example:
        >>> _validate_and_normalize_target('EXAMPLE.COM')
        'example.com'
        >>> _validate_and_normalize_target('http://example.com')
        'example.com'
    """
    try:
        normalized_target = normalize_domain(target_name)
        validate_domain(normalized_target)
        logger.debug("域名验证通过: %s -> %s", target_name, normalized_target)
        return normalized_target
    except ValueError as e:
        error_msg = f"无效的目标域名: {target_name} - {e}"
        logger.error(error_msg)
        raise ValueError(error_msg) from e


@flow(
    name="subdomain_discovery", 
    log_prints=True,
    on_running=[on_scan_flow_running],
    on_completion=[on_scan_flow_completed],
    on_failure=[on_scan_flow_failed],
    on_cancellation=[on_scan_flow_cancelled],
    on_crashed=[on_scan_flow_crashed]
)
def subdomain_discovery_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    engine_config: str
) -> dict:
    """
    子域名发现扫描流程
    
    编排步骤：
    1. 并行运行多个扫描工具（amass、subfinder）
    2. 合并、解析并验证域名（一体化处理，高性能）
    3. 批量保存到数据库
    
    Args:
        scan_id: 扫描任务 ID
        target_name: 目标名称（域名）
        target_id: 目标 ID
        scan_workspace_dir: Scan 工作空间目录（由 Service 层创建）
        engine_config: 引擎配置（YAML 字符串，必需）
    
    Returns:
        dict: {
            'success': bool,
            'scan_id': int,
            'target': str,
            'scan_workspace_dir': str,
            'total': int,
            'executed_tasks': list
        }
    
    Raises:
        ValueError: 配置错误
        RuntimeError: 执行失败
    """
    try:
        # ==================== 参数验证 ====================
        if scan_id is None:
            raise ValueError("scan_id 不能为空")
        if not target_name:
            raise ValueError("target_name 不能为空")
        if target_id is None:
            raise ValueError("target_id 不能为空")
        if not scan_workspace_dir:
            raise ValueError("scan_workspace_dir 不能为空")
        if not engine_config:
            raise ValueError("engine_config 不能为空")
        
        logger.info(
            "="*60 + "\n" +
            "开始子域名发现扫描\n" +
            f"  Scan ID: {scan_id}\n" +
            f"  Target: {target_name}\n" +
            f"  Workspace: {scan_workspace_dir}\n" +
            "="*60
        )
        
        # ==================== Step 1: 并行运行扫描工具 ====================
        from apps.scan.tasks.subdomain_discovery import (
            run_subdomain_discovery_task,
            merge_and_validate_task,
            save_domains_task
        )
        
        # 准备结果目录（集中管理路径）
        result_dir = Path(scan_workspace_dir) / 'subdomain_discovery'
        result_dir.mkdir(parents=True, exist_ok=True)

        if not result_dir.is_dir():
            raise RuntimeError(f"子域名扫描目录创建失败: {result_dir}")
        if not os.access(result_dir, os.W_OK):
            raise RuntimeError(f"子域名扫描目录不可写: {result_dir}")

        # ==================== 规范化和验证域名 ====================
        target_name = _validate_and_normalize_target(target_name)
        
        # ==================== Step 1: 解析配置，获取启用的工具 ====================
        enabled_tools = config_parser.parse_enabled_tools(
            scan_type='subdomain_discovery',
            engine_config=engine_config
        )
        
        if not enabled_tools:
            raise RuntimeError("没有启用的扫描工具，请检查引擎配置。")
        
        # ==================== Step 2: 构建命令并提交并行任务 ====================
        # 生成时间戳（所有工具共用）
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        logger.info(f"开始并行运行 {len(enabled_tools)} 个扫描工具")
        
        # TODO: 接入代理池管理系统
        # from apps.proxy.services import proxy_pool
        # proxy_stats = proxy_pool.get_stats()
        # logger.info(f"代理池状态: {proxy_stats['healthy']}/{proxy_stats['total']} 可用")
        
        futures = {}
        
        for tool_name, tool_config in enabled_tools.items():
            # 2.1 生成唯一的输出文件路径
            short_uuid = uuid.uuid4().hex[:4]
            output_file = f"{result_dir}/{tool_name}_{timestamp}_{short_uuid}.txt"
            
            # 2.2 构建完整命令（变量替换）
            try:
                command = build_scan_command(
                    tool_name=tool_name,
                    scan_type='subdomain_discovery',
                    command_params={
                        'target': target_name,      # 对应 {target}
                        'output_file': output_file  # 对应 {output_file}
                    },
                    tool_config=tool_config
                )
            except Exception as e:
                failure_msg = f"{tool_name}: 命令构建失败 - {e}"
                failures.append(failure_msg)
                logger.error(f"构建 {tool_name} 命令失败: {e}")
                continue
            
            # 2.3 获取超时时间（已在 config_parser 中验证）
            timeout = tool_config['timeout']
            
            # 2.4 提交任务
            logger.debug(
                f"提交任务 - 工具: {tool_name}, 超时: {timeout}s, 输出: {output_file}"
            )
            
            future = run_subdomain_discovery_task.submit(
                tool=tool_name,
                command=command,
                timeout=timeout,
                output_file=output_file
            )
            futures[tool_name] = future
        
        # 提前检查是否有任何工具成功提交
        if not futures:
            error_msg = (
                f"所有扫描工具均无法启动 - 目标: {target_name}.\n"
                f"失败详情:\n" + "\n".join(f"  - {f}" for f in failures)
            )
            raise RuntimeError(error_msg)
        
        # 等待并行任务完成，获取结果
        # 注意：Task 资源由 Prefect 调度器管理，完成后自动释放，不受此处等待影响
        result_files = []
        
        for tool_name, future in futures.items():
            try:
                result = future.result()  # 返回文件路径（字符串）或 ""（失败）
                if result:
                    result_files.append(result)
                    logger.info("✓ 扫描工具 %s 执行成功: %s", tool_name, result)
                else:
                    failure_msg = f"{tool_name}: 未生成结果文件"
                    failures.append(failure_msg)
                    logger.warning("⚠️ 扫描工具 %s 未生成结果文件", tool_name)
            except Exception as e:
                failure_msg = f"{tool_name}: {str(e)}"
                failures.append(failure_msg)
                logger.warning("⚠️ 扫描工具 %s 执行失败: %s", tool_name, str(e))
        
        if not result_files:
            error_msg = (
                f"所有扫描工具均失败 - 目标: {target_name}.\n"
                f"失败详情:\n" + "\n".join(f"  - {f}" for f in failures)
            )
            raise RuntimeError(error_msg)
        
        logger.info(
            "✓ 扫描工具并行执行完成 - 成功: %d/%d",
            len(result_files), len(futures)
        )
        
        # ==================== Step 2: 合并并去重域名 ====================
        logger.info("Step 2: 合并并去重域名")
        
        merged_file = merge_and_validate_task(
            result_files=result_files,
            result_dir=str(result_dir)
        )
        
        # ==================== Step 3: 流式保存到数据库 ====================
        logger.info("Step 3: 流式保存到数据库")
        
        save_result = save_domains_task(
            domains_file=merged_file,
            scan_id=scan_id,
            target_id=target_id
        )
        processed_domains = save_result.get('processed_records', 0)
        
        logger.info("="*60 + "\n✓ 子域名发现扫描完成\n" + "="*60)
        
        # 动态生成已执行的任务列表，用于返回结果
        executed_tasks = [f'run_scanner ({tool})' for tool in futures.keys()]
        executed_tasks.extend([
            'merge_and_validate', 
            'save_domains'
        ])
        
        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': scan_workspace_dir,
            'total': processed_domains,
            'executed_tasks': executed_tasks
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
