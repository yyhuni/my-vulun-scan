"""
子域名发现扫描 Flow

负责编排子域名发现扫描的完整流程

架构：
- Flow 负责编排多个原子 Task
- 支持并行执行扫描工具
- 每个 Task 可独立重试
- 配置由 YAML 解析
"""

# Django 环境初始化（导入即生效）
from apps.common.prefect_django_setup import setup_django_for_prefect

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


def _setup_subdomain_directory(scan_workspace_dir: str) -> Path:
    """
    创建并验证子域名扫描工作目录
    
    Args:
        scan_workspace_dir: 扫描工作空间目录
        
    Returns:
        Path: 子域名扫描目录路径
        
    Raises:
        RuntimeError: 目录创建或验证失败
    """
    result_dir = Path(scan_workspace_dir) / 'subdomain_discovery'
    result_dir.mkdir(parents=True, exist_ok=True)
    
    if not result_dir.is_dir():
        raise RuntimeError(f"子域名扫描目录创建失败: {result_dir}")
    if not os.access(result_dir, os.W_OK):
        raise RuntimeError(f"子域名扫描目录不可写: {result_dir}")
    
    return result_dir


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


def _run_scans_parallel(
    enabled_tools: dict,
    domain_name: str,
    result_dir: Path
) -> tuple[list, list, list]:
    """
    并行运行所有启用的子域名扫描工具
    
    Args:
        enabled_tools: 启用的工具配置字典 {'tool_name': {'timeout': 600, ...}}
        domain_name: 目标域名
        result_dir: 结果输出目录
        
    Returns:
        tuple: (result_files, failed_tools, successful_tool_names)
        
    Raises:
        RuntimeError: 所有工具均失败
    """
    # 导入任务函数
    from apps.scan.tasks.subdomain_discovery import run_subdomain_discovery_task
    
    # 生成时间戳（所有工具共用）
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # TODO: 接入代理池管理系统
    # from apps.proxy.services import proxy_pool
    # proxy_stats = proxy_pool.get_stats()
    # logger.info(f"代理池状态: {proxy_stats['healthy']}/{proxy_stats['total']} 可用")
    
    failures = []  # 记录命令构建失败的工具
    futures = {}
    
    # 1. 构建命令并提交并行任务
    for tool_name, tool_config in enabled_tools.items():
        # 1.1 生成唯一的输出文件路径（绝对路径）
        short_uuid = uuid.uuid4().hex[:4]
        output_file = str(result_dir / f"{tool_name}_{timestamp}_{short_uuid}.txt")
        
        # 1.2 构建完整命令（变量替换）
        try:
            command = build_scan_command(
                tool_name=tool_name,
                scan_type='subdomain_discovery',
                command_params={
                    'domain': domain_name,      # 对应 {domain}
                    'output_file': output_file  # 对应 {output_file}
                },
                tool_config=tool_config
            )
        except Exception as e:
            failure_msg = f"{tool_name}: 命令构建失败 - {e}"
            failures.append(failure_msg)
            logger.error(f"构建 {tool_name} 命令失败: {e}")
            continue
        
        # 1.3 获取超时时间（支持 'auto' 动态计算）
        timeout = tool_config['timeout']
        if timeout == 'auto':
            # 子域名发现工具通常运行时间较长，使用默认值 600 秒
            timeout = 600
            logger.info(f"✓ 工具 {tool_name} 使用默认 timeout: {timeout}秒")
        
        # 1.4 提交任务
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
    
    # 2. 检查是否有任何工具成功提交
    if not futures:
        error_msg = (
            f"所有扫描工具均无法启动 - 目标: {domain_name}.\n"
            f"失败详情:\n" + "\n".join(f"  - {f}" for f in failures)
        )
        raise RuntimeError(error_msg)
    
    # 3. 等待并行任务完成，获取结果
    result_files = []
    failed_tools = []
    
    for tool_name, future in futures.items():
        try:
            result = future.result()  # 返回文件路径（字符串）或 ""（失败）
            if result:
                result_files.append(result)
                logger.info("✓ 扫描工具 %s 执行成功: %s", tool_name, result)
            else:
                failure_msg = f"{tool_name}: 未生成结果文件"
                failures.append(failure_msg)
                failed_tools.append({'tool': tool_name, 'reason': '未生成结果文件'})
                logger.warning("⚠️ 扫描工具 %s 未生成结果文件", tool_name)
        except Exception as e:
            failure_msg = f"{tool_name}: {str(e)}"
            failures.append(failure_msg)
            failed_tools.append({'tool': tool_name, 'reason': str(e)})
            logger.warning("⚠️ 扫描工具 %s 执行失败: %s", tool_name, str(e))
    
    # 4. 检查是否有成功的工具
    if not result_files:
        error_msg = (
            f"所有扫描工具均失败 - 目标: {domain_name}.\n"
            f"失败详情:\n" + "\n".join(f"  - {f}" for f in failures)
        )
        raise RuntimeError(error_msg)
    
    # 5. 动态计算成功的工具列表
    successful_tool_names = [name for name in futures.keys() 
                              if name not in [f['tool'] for f in failed_tools]]
    
    logger.info(
        "✓ 扫描工具并行执行完成 - 成功: %d/%d (成功: %s, 失败: %s)",
        len(result_files), len(futures),
        ', '.join(successful_tool_names) if successful_tool_names else '无',
        ', '.join([f['tool'] for f in failed_tools]) if failed_tools else '无'
    )
    
    return result_files, failed_tools, successful_tool_names


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
    enabled_tools: dict
) -> dict:
    """
    子域名发现扫描流程
    
    工作流程：
        Step 0: 准备工作（目录创建、域名验证）
        Step 1: 解析配置，获取启用的工具
        Step 2: 并行运行扫描工具
        Step 3: 合并并去重域名
        Step 4: 保存到数据库
    
    Args:
        scan_id: 扫描任务 ID
        target_name: 目标名称（域名）
        target_id: 目标 ID
        scan_workspace_dir: Scan 工作空间目录（由 Service 层创建）
        enabled_tools: 启用的工具配置字典
    
    Returns:
        dict: {
            'success': bool,
            'scan_id': int,
            'target': str,
            'scan_workspace_dir': str,
            'total': int,
            'executed_tasks': list,
            'tool_stats': {
                'total': int,                    # 总工具数
                'successful': int,               # 成功工具数
                'failed': int,                   # 失败工具数
                'successful_tools': list[str],   # 成功工具列表 ['subfinder', 'amass']
                'failed_tools': list[dict]       # 失败工具列表 [{'tool': 'oneforall', 'reason': '超时'}]
            }
        }
    
    Raises:
        ValueError: 配置错误
        RuntimeError: 执行失败
    """
    try:
        # ==================== 参数验证 ====================
        if scan_id is None:
            raise ValueError("scan_id 不能为空")
        if target_id is None:
            raise ValueError("target_id 不能为空")
        if not scan_workspace_dir:
            raise ValueError("scan_workspace_dir 不能为空")
        if enabled_tools is None:
            raise ValueError("enabled_tools 不能为空")
        
        # 如果未提供目标域名，跳过扫描
        if not target_name:
            logger.warning("未提供目标域名，跳过子域名发现扫描")
            return {
                'success': True,
                'scan_id': scan_id,
                'target': '',
                'scan_workspace_dir': scan_workspace_dir,
                'total': 0,
                'executed_tasks': [],
                'tool_stats': {
                    'total': 0,
                    'successful': 0,
                    'failed': 0,
                    'successful_tools': [],
                    'failed_tools': []
                }
            }
        
        # 导入任务函数
        from apps.scan.tasks.subdomain_discovery import (
            run_subdomain_discovery_task,
            merge_and_validate_task,
            save_domains_task
        )
        
        # Step 0: 准备工作
        result_dir = _setup_subdomain_directory(scan_workspace_dir)
        
        # 验证并规范化目标域名
        try:
            domain_name = _validate_and_normalize_target(target_name)
        except ValueError as e:
            logger.warning("目标域名无效，跳过子域名发现扫描: %s", e)
            return {
                'success': True,
                'scan_id': scan_id,
                'target': target_name,
                'scan_workspace_dir': scan_workspace_dir,
                'total': 0,
                'executed_tasks': [],
                'tool_stats': {
                    'total': 0,
                    'successful': 0,
                    'failed': 0,
                    'successful_tools': [],
                    'failed_tools': []
                }
            }
        
        # 验证成功后打印日志（使用规范化后的域名）
        logger.info(
            "="*60 + "\n" +
            "开始子域名发现扫描\n" +
            f"  Scan ID: {scan_id}\n" +
            f"  Domain: {domain_name}\n" +
            f"  Workspace: {scan_workspace_dir}\n" +
            "="*60
        )
        
        # Step 1: 工具配置信息
        logger.info("Step 1: 工具配置信息")
        logger.info(
            "✓ 启用工具: %s",
            ', '.join(enabled_tools.keys())
        )
        
        # Step 2: 并行运行扫描工具
        logger.info("Step 2: 并行运行扫描工具")
        result_files, failed_tools, successful_tool_names = _run_scans_parallel(
            enabled_tools=enabled_tools,
            domain_name=domain_name,
            result_dir=result_dir
        )
        
        # Step 3: 合并并去重域名
        logger.info("Step 3: 合并并去重域名")
        
        merged_file = merge_and_validate_task(
            result_files=result_files,
            result_dir=str(result_dir)
        )
        
        # Step 4: 保存到数据库
        logger.info("Step 4: 保存到数据库")
        
        save_result = save_domains_task(
            domains_file=merged_file,
            scan_id=scan_id,
            target_id=target_id
        )
        processed_domains = save_result.get('processed_records', 0)
        
        logger.info("="*60 + "\n✓ 子域名发现扫描完成\n" + "="*60)
        
        # 动态生成已执行的任务列表
        executed_tasks = ['parse_config']
        executed_tasks.extend([f'run_scanner ({tool})' for tool in successful_tool_names])
        executed_tasks.extend(['merge_and_validate', 'save_domains'])
        
        return {
            'success': True,
            'scan_id': scan_id,
            'target': domain_name,
            'scan_workspace_dir': scan_workspace_dir,
            'total': processed_domains,
            'executed_tasks': executed_tasks,
            'tool_stats': {
                'total': len(enabled_tools),
                'successful': len(successful_tool_names),
                'failed': len(failed_tools),
                'successful_tools': successful_tool_names,
                'failed_tools': failed_tools  # [{'tool': 'subfinder', 'reason': '超时'}]
            }
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
