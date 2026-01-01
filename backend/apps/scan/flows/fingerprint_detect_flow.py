"""
指纹识别 Flow

负责编排指纹识别的完整流程

架构：
- Flow 负责编排多个原子 Task
- 在 site_scan 后串行执行
- 使用 xingfinger 工具识别技术栈
- 流式处理输出，批量更新数据库
"""

# Django 环境初始化（导入即生效）
from apps.common.prefect_django_setup import setup_django_for_prefect

import logging
import os
from datetime import datetime
from pathlib import Path

from prefect import flow

from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_running,
    on_scan_flow_completed,
    on_scan_flow_failed,
)
from apps.scan.tasks.fingerprint_detect import (
    export_urls_for_fingerprint_task,
    run_xingfinger_and_stream_update_tech_task,
)
from apps.scan.utils import build_scan_command
from apps.scan.utils.fingerprint_helpers import get_fingerprint_paths

logger = logging.getLogger(__name__)


def calculate_fingerprint_detect_timeout(
    url_count: int,
    base_per_url: float = 10.0,
    min_timeout: int = 300
) -> int:
    """
    根据 URL 数量计算超时时间
    
    公式：超时时间 = URL 数量 × 每 URL 基础时间
    最小值：300秒
    无上限
    
    Args:
        url_count: URL 数量
        base_per_url: 每 URL 基础时间（秒），默认 10秒
        min_timeout: 最小超时时间（秒），默认 300秒
        
    Returns:
        int: 计算出的超时时间（秒）
        
    """
    timeout = int(url_count * base_per_url)
    return max(min_timeout, timeout)





def _export_urls(
    target_id: int,
    fingerprint_dir: Path,
    source: str = 'website'
) -> tuple[str, int]:
    """
    导出 URL 到文件
    
    Args:
        target_id: 目标 ID
        fingerprint_dir: 指纹识别目录
        source: 数据源类型
        
    Returns:
        tuple: (urls_file, total_count)
    """
    logger.info("Step 1: 导出 URL 列表 (source=%s)", source)
    
    urls_file = str(fingerprint_dir / 'urls.txt')
    export_result = export_urls_for_fingerprint_task(
        target_id=target_id,
        output_file=urls_file,
        source=source,
        batch_size=1000
    )
    
    total_count = export_result['total_count']
    
    logger.info(
        "✓ URL 导出完成 - 文件: %s, 数量: %d",
        export_result['output_file'],
        total_count
    )
    
    return export_result['output_file'], total_count


def _run_fingerprint_detect(
    enabled_tools: dict,
    urls_file: str,
    url_count: int,
    fingerprint_dir: Path,
    scan_id: int,
    target_id: int,
    source: str
) -> tuple[dict, list]:
    """
    执行指纹识别任务
    
    Args:
        enabled_tools: 已启用的工具配置字典
        urls_file: URL 文件路径
        url_count: URL 总数
        fingerprint_dir: 指纹识别目录
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        source: 数据源类型
        
    Returns:
        tuple: (tool_stats, failed_tools)
    """
    tool_stats = {}
    failed_tools = []
    
    for tool_name, tool_config in enabled_tools.items():
        # 1. 获取指纹库路径
        lib_names = tool_config.get('fingerprint_libs', ['ehole'])
        fingerprint_paths = get_fingerprint_paths(lib_names)
        
        if not fingerprint_paths:
            reason = f"没有可用的指纹库: {lib_names}"
            logger.warning(reason)
            failed_tools.append({'tool': tool_name, 'reason': reason})
            continue
        
        # 2. 将指纹库路径合并到 tool_config（用于命令构建）
        tool_config_with_paths = {**tool_config, **fingerprint_paths}
        
        # 3. 构建命令
        try:
            command = build_scan_command(
                tool_name=tool_name,
                scan_type='fingerprint_detect',
                command_params={
                    'urls_file': urls_file
                },
                tool_config=tool_config_with_paths
            )
        except Exception as e:
            reason = f"命令构建失败: {str(e)}"
            logger.error("构建 %s 命令失败: %s", tool_name, e)
            failed_tools.append({'tool': tool_name, 'reason': reason})
            continue
        
        # 4. 计算超时时间
        timeout = calculate_fingerprint_detect_timeout(url_count)
        
        # 5. 生成日志文件路径
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        log_file = fingerprint_dir / f"{tool_name}_{timestamp}.log"
        
        logger.info(
            "开始执行 %s 指纹识别 - URL数: %d, 超时: %ds, 指纹库: %s",
            tool_name, url_count, timeout, list(fingerprint_paths.keys())
        )
        
        # 6. 执行扫描任务
        try:
            result = run_xingfinger_and_stream_update_tech_task(
                cmd=command,
                tool_name=tool_name,
                scan_id=scan_id,
                target_id=target_id,
                source=source,
                cwd=str(fingerprint_dir),
                timeout=timeout,
                log_file=str(log_file),
                batch_size=100
            )
            
            tool_stats[tool_name] = {
                'command': command,
                'result': result,
                'timeout': timeout,
                'fingerprint_libs': list(fingerprint_paths.keys())
            }
            
            logger.info(
                "✓ 工具 %s 执行完成 - 处理记录: %d, 更新: %d, 未找到: %d",
                tool_name,
                result.get('processed_records', 0),
                result.get('updated_count', 0),
                result.get('not_found_count', 0)
            )
            
        except Exception as exc:
            failed_tools.append({'tool': tool_name, 'reason': str(exc)})
            logger.error("工具 %s 执行失败: %s", tool_name, exc, exc_info=True)
    
    if failed_tools:
        logger.warning(
            "以下指纹识别工具执行失败: %s",
            ', '.join([f['tool'] for f in failed_tools])
        )
    
    return tool_stats, failed_tools


@flow(
    name="fingerprint_detect",
    log_prints=True,
    on_running=[on_scan_flow_running],
    on_completion=[on_scan_flow_completed],
    on_failure=[on_scan_flow_failed],
)
def fingerprint_detect_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    enabled_tools: dict
) -> dict:
    """
    指纹识别 Flow
    
    主要功能：
        1. 从数据库导出目标下所有 WebSite URL 到文件
        2. 使用 xingfinger 进行技术栈识别
        3. 解析结果并更新 WebSite.tech 字段（合并去重）
    
    工作流程：
        Step 0: 创建工作目录
        Step 1: 导出 URL 列表
        Step 2: 解析配置，获取启用的工具
        Step 3: 执行 xingfinger 并解析结果
    
    Args:
        scan_id: 扫描任务 ID
        target_name: 目标名称
        target_id: 目标 ID
        scan_workspace_dir: 扫描工作空间目录
        enabled_tools: 启用的工具配置（xingfinger）
        
    Returns:
        dict: {
            'success': bool,
            'scan_id': int,
            'target': str,
            'scan_workspace_dir': str,
            'urls_file': str,
            'url_count': int,
            'processed_records': int,
            'updated_count': int,
            'created_count': int,
            'snapshot_count': int,
            'executed_tasks': list,
            'tool_stats': dict
        }
    """
    try:
        logger.info(
            "="*60 + "\n" +
            "开始指纹识别\n" +
            f"  Scan ID: {scan_id}\n" +
            f"  Target: {target_name}\n" +
            f"  Workspace: {scan_workspace_dir}\n" +
            "="*60
        )
        
        # 参数验证
        if scan_id is None:
            raise ValueError("scan_id 不能为空")
        if not target_name:
            raise ValueError("target_name 不能为空")
        if target_id is None:
            raise ValueError("target_id 不能为空")
        if not scan_workspace_dir:
            raise ValueError("scan_workspace_dir 不能为空")
        
        # 数据源类型（当前只支持 website）
        source = 'website'
        
        # Step 0: 创建工作目录
        from apps.scan.utils import setup_scan_directory
        fingerprint_dir = setup_scan_directory(scan_workspace_dir, 'fingerprint_detect')
        
        # Step 1: 导出 URL（支持懒加载）
        urls_file, url_count = _export_urls(target_id, fingerprint_dir, source)
        
        if url_count == 0:
            logger.warning("目标下没有可用的 URL，跳过指纹识别")
            return {
                'success': True,
                'scan_id': scan_id,
                'target': target_name,
                'scan_workspace_dir': scan_workspace_dir,
                'urls_file': urls_file,
                'url_count': 0,
                'processed_records': 0,
                'updated_count': 0,
                'created_count': 0,
                'snapshot_count': 0,
                'executed_tasks': ['export_urls_for_fingerprint'],
                'tool_stats': {
                    'total': 0,
                    'successful': 0,
                    'failed': 0,
                    'successful_tools': [],
                    'failed_tools': [],
                    'details': {}
                }
            }
        
        # Step 2: 工具配置信息
        logger.info("Step 2: 工具配置信息")
        logger.info("✓ 启用工具: %s", ', '.join(enabled_tools.keys()))
        
        # Step 3: 执行指纹识别
        logger.info("Step 3: 执行指纹识别")
        tool_stats, failed_tools = _run_fingerprint_detect(
            enabled_tools=enabled_tools,
            urls_file=urls_file,
            url_count=url_count,
            fingerprint_dir=fingerprint_dir,
            scan_id=scan_id,
            target_id=target_id,
            source=source
        )
        
        logger.info("="*60 + "\n✓ 指纹识别完成\n" + "="*60)
        
        # 动态生成已执行的任务列表
        executed_tasks = ['export_urls_for_fingerprint']
        executed_tasks.extend([f'run_xingfinger ({tool})' for tool in tool_stats.keys()])
        
        # 汇总所有工具的结果
        total_processed = sum(stats['result'].get('processed_records', 0) for stats in tool_stats.values())
        total_updated = sum(stats['result'].get('updated_count', 0) for stats in tool_stats.values())
        total_created = sum(stats['result'].get('created_count', 0) for stats in tool_stats.values())
        total_snapshots = sum(stats['result'].get('snapshot_count', 0) for stats in tool_stats.values())
        
        successful_tools = [name for name in enabled_tools.keys() 
                           if name not in [f['tool'] for f in failed_tools]]
        
        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': scan_workspace_dir,
            'urls_file': urls_file,
            'url_count': url_count,
            'processed_records': total_processed,
            'updated_count': total_updated,
            'created_count': total_created,
            'snapshot_count': total_snapshots,
            'executed_tasks': executed_tasks,
            'tool_stats': {
                'total': len(enabled_tools),
                'successful': len(successful_tools),
                'failed': len(failed_tools),
                'successful_tools': successful_tools,
                'failed_tools': failed_tools,
                'details': tool_stats
            }
        }
        
    except ValueError as e:
        logger.error("配置错误: %s", e)
        raise
    except RuntimeError as e:
        logger.error("运行时错误: %s", e)
        raise
    except Exception as e:
        logger.exception("指纹识别失败: %s", e)
        raise
