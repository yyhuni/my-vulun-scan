"""
端口扫描 Flow

负责编排端口扫描的完整流程

架构：
- Flow 负责编排多个原子 Task
- 支持串行执行扫描工具（流式处理）
- 每个 Task 可独立重试
- 配置由 YAML 解析
"""

import logging
import subprocess
from datetime import datetime
from pathlib import Path

from prefect import flow

from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_running,
)
from apps.scan.tasks.port_scan import (
    export_hosts_task,
    run_and_stream_save_ports_task,
)
from apps.scan.utils import build_scan_command, user_log, wait_for_system_load

logger = logging.getLogger(__name__)


def calculate_port_scan_timeout(
    tool_config: dict,
    file_path: str,
    base_per_pair: float = 0.5
) -> int:
    """
    根据目标数量和端口数量计算超时时间

    计算公式：超时时间 = 目标数 × 端口数 × base_per_pair
    超时范围：60秒 ~ 无上限

    Args:
        tool_config: 工具配置字典，包含端口配置（ports, top-ports等）
        file_path: 目标文件路径（域名/IP列表）
        base_per_pair: 每个"端口-目标对"的基础时间（秒），默认 0.5秒

    Returns:
        int: 计算出的超时时间（秒），最小 60 秒
    """
    try:
        result = subprocess.run(
            ['wc', '-l', file_path],
            capture_output=True,
            text=True,
            check=True
        )
        target_count = int(result.stdout.strip().split()[0])
        port_count = _parse_port_count(tool_config)
        total_work = target_count * port_count
        timeout = max(60, int(total_work * base_per_pair))

        logger.info(
            "计算端口扫描 timeout - 目标数: %d, 端口数: %d, 总工作量: %d, 超时: %d秒",
            target_count, port_count, total_work, timeout
        )
        return timeout

    except Exception as e:
        logger.warning("计算 timeout 失败: %s，使用默认值 600秒", e)
        return 600


def _parse_port_count(tool_config: dict) -> int:
    """
    从工具配置中解析端口数量

    优先级：
    1. top-ports: N  → 返回 N
    2. ports: "80,443,8080"  → 返回逗号分隔的数量
    3. ports: "1-1000"  → 返回范围的大小
    4. ports: "1-65535"  → 返回 65535
    5. 默认  → 返回 100（naabu 默认扫描 top 100）

    Args:
        tool_config: 工具配置字典

    Returns:
        int: 端口数量
    """
    # 检查 top-ports 配置
    if 'top-ports' in tool_config:
        top_ports = tool_config['top-ports']
        if isinstance(top_ports, int) and top_ports > 0:
            return top_ports
        logger.warning("top-ports 配置无效: %s，使用默认值", top_ports)

    # 检查 ports 配置
    if 'ports' in tool_config:
        ports_str = str(tool_config['ports']).strip()

        # 逗号分隔的端口列表：80,443,8080
        if ',' in ports_str:
            return len([p.strip() for p in ports_str.split(',') if p.strip()])

        # 端口范围：1-1000
        if '-' in ports_str:
            try:
                start, end = ports_str.split('-', 1)
                start_port = int(start.strip())
                end_port = int(end.strip())
                if 1 <= start_port <= end_port <= 65535:
                    return end_port - start_port + 1
                logger.warning("端口范围无效: %s，使用默认值", ports_str)
            except ValueError:
                logger.warning("端口范围解析失败: %s，使用默认值", ports_str)

        # 单个端口
        try:
            port = int(ports_str)
            if 1 <= port <= 65535:
                return 1
        except ValueError:
            logger.warning("端口配置解析失败: %s，使用默认值", ports_str)

    # 默认值：naabu 默认扫描 top 100 端口
    return 100





def _export_hosts(port_scan_dir: Path, provider) -> tuple[str, int]:
    """
    导出主机列表到文件

    Args:
        port_scan_dir: 端口扫描目录
        provider: TargetProvider 实例

    Returns:
        tuple: (hosts_file, host_count)
    """
    logger.info("Step 1: 导出主机列表")

    hosts_file = str(port_scan_dir / 'hosts.txt')
    export_result = export_hosts_task(
        output_file=hosts_file,
        provider=provider,
    )

    host_count = export_result['total_count']

    logger.info(
        "✓ 主机列表导出完成 - 文件: %s, 数量: %d",
        export_result['output_file'], host_count
    )

    if host_count == 0:
        logger.warning("目标下没有可扫描的主机，无法执行端口扫描")

    return export_result['output_file'], host_count


def _run_scans_sequentially(
    enabled_tools: dict,
    domains_file: str,
    port_scan_dir: Path,
    scan_id: int,
    target_id: int,
    target_name: str,
) -> tuple[dict, int, list, list]:
    """
    串行执行端口扫描任务

    Args:
        enabled_tools: 已启用的工具配置字典
        domains_file: 域名文件路径
        port_scan_dir: 端口扫描目录
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        target_name: 目标名称（用于日志显示）

    Returns:
        tuple: (tool_stats, processed_records, successful_tool_names, failed_tools)
    """
    tool_stats = {}
    processed_records = 0
    failed_tools = []

    for tool_name, tool_config in enabled_tools.items():
        # 构建命令
        try:
            command = build_scan_command(
                tool_name=tool_name,
                scan_type='port_scan',
                command_params={'domains_file': domains_file},
                tool_config=tool_config
            )
        except Exception as e:
            reason = f"命令构建失败: {e}"
            logger.error("构建 %s 命令失败: %s", tool_name, e)
            failed_tools.append({'tool': tool_name, 'reason': reason})
            continue

        # 获取超时时间
        config_timeout = tool_config['timeout']
        if config_timeout == 'auto':
            config_timeout = calculate_port_scan_timeout(tool_config, str(domains_file))
            logger.info("✓ 工具 %s 动态计算 timeout: %d秒", tool_name, config_timeout)

        # 生成日志文件路径
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        log_file = port_scan_dir / f"{tool_name}_{timestamp}.log"

        logger.info("开始执行 %s 扫描（超时: %d秒）...", tool_name, config_timeout)
        user_log(scan_id, "port_scan", f"Running {tool_name}: {command}")

        # 执行扫描任务
        try:
            result = run_and_stream_save_ports_task(
                cmd=command,
                tool_name=tool_name,
                scan_id=scan_id,
                target_id=target_id,
                cwd=str(port_scan_dir),
                shell=True,
                batch_size=1000,
                timeout=config_timeout,
                log_file=str(log_file)
            )

            tool_stats[tool_name] = {
                'command': command,
                'result': result,
                'timeout': config_timeout
            }
            tool_records = result.get('processed_records', 0)
            processed_records += tool_records
            logger.info("✓ 工具 %s 流式处理完成 - 记录数: %d", tool_name, tool_records)
            user_log(scan_id, "port_scan", f"{tool_name} completed: found {tool_records} ports")

        except subprocess.TimeoutExpired:
            reason = f"timeout after {config_timeout}s"
            failed_tools.append({'tool': tool_name, 'reason': reason})
            logger.warning(
                "⚠️ 工具 %s 执行超时 - 超时配置: %d秒\n"
                "注意：超时前已解析的端口数据已保存到数据库，但扫描未完全完成。",
                tool_name, config_timeout
            )
            user_log(scan_id, "port_scan", f"{tool_name} failed: {reason}", "error")
        except Exception as exc:
            reason = str(exc)
            failed_tools.append({'tool': tool_name, 'reason': reason})
            logger.error("工具 %s 执行失败: %s", tool_name, exc, exc_info=True)
            user_log(scan_id, "port_scan", f"{tool_name} failed: {reason}", "error")

    if failed_tools:
        logger.warning(
            "以下扫描工具执行失败: %s",
            ', '.join([f['tool'] for f in failed_tools])
        )

    if not tool_stats:
        error_details = "; ".join([f"{f['tool']}: {f['reason']}" for f in failed_tools])
        logger.warning("所有端口扫描工具均失败 - Target: %s, 失败工具: %s", target_name, error_details)
        return {}, 0, [], failed_tools

    successful_tool_names = [
        name for name in enabled_tools
        if name not in [f['tool'] for f in failed_tools]
    ]

    logger.info(
        "✓ 串行端口扫描执行完成 - 成功: %d/%d (成功: %s, 失败: %s)",
        len(tool_stats), len(enabled_tools),
        ', '.join(successful_tool_names) if successful_tool_names else '无',
        ', '.join([f['tool'] for f in failed_tools]) if failed_tools else '无'
    )

    return tool_stats, processed_records, successful_tool_names, failed_tools


@flow(
    name="port_scan",
    log_prints=True,
    on_running=[on_scan_flow_running],
    on_completion=[on_scan_flow_completed],
    on_failure=[on_scan_flow_failed],
)
def port_scan_flow(
    scan_id: int,
    target_id: int,
    scan_workspace_dir: str,
    enabled_tools: dict,
    provider,
) -> dict:
    """
    端口扫描 Flow

    主要功能：
        1. 扫描目标域名/IP 的开放端口
        2. 保存 host + ip + port 三元映射到 HostPortMapping 表

    输出资产：
        - HostPortMapping：主机端口映射（host + ip + port 三元组）

    工作流程：
        Step 0: 创建工作目录
        Step 1: 导出域名列表到文件（供扫描工具使用）
        Step 2: 解析配置，获取启用的工具
        Step 3: 串行执行扫描工具，运行端口扫描工具并实时解析输出到数据库

    Args:
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        scan_workspace_dir: Scan 工作空间目录
        enabled_tools: 启用的工具配置字典
        provider: TargetProvider 实例

    Returns:
        dict: 扫描结果

    Raises:
        ValueError: 配置错误
        RuntimeError: 执行失败
    """
    try:
        wait_for_system_load(context="port_scan_flow")

        # 从 provider 获取 target_name
        target_name = provider.get_target_name()
        if not target_name:
            raise ValueError("无法获取 Target 名称")

        if scan_id is None:
            raise ValueError("scan_id 不能为空")
        if target_id is None:
            raise ValueError("target_id 不能为空")
        if not scan_workspace_dir:
            raise ValueError("scan_workspace_dir 不能为空")
        if not enabled_tools:
            raise ValueError("enabled_tools 不能为空")

        logger.info(
            "开始端口扫描 - Scan ID: %s, Target: %s, Workspace: %s",
            scan_id, target_name, scan_workspace_dir
        )
        user_log(scan_id, "port_scan", "Starting port scan")

        # Step 0: 创建工作目录
        from apps.scan.utils import setup_scan_directory
        port_scan_dir = setup_scan_directory(scan_workspace_dir, 'port_scan')

        # Step 1: 导出主机列表
        hosts_file, host_count = _export_hosts(port_scan_dir, provider)

        if host_count == 0:
            logger.warning("跳过端口扫描：没有主机可扫描 - Scan ID: %s", scan_id)
            user_log(scan_id, "port_scan", "Skipped: no hosts to scan", "warning")
            return {
                'success': True,
                'scan_id': scan_id,
                'target': target_name,
                'scan_workspace_dir': scan_workspace_dir,
                'hosts_file': hosts_file,
                'host_count': 0,
                'processed_records': 0,
                'executed_tasks': ['export_hosts'],
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

        # Step 3: 串行执行扫描工具
        logger.info("Step 3: 串行执行扫描工具")
        tool_stats, processed_records, successful_tool_names, failed_tools = _run_scans_sequentially(
            enabled_tools=enabled_tools,
            domains_file=hosts_file,
            port_scan_dir=port_scan_dir,
            scan_id=scan_id,
            target_id=target_id,
            target_name=target_name,
        )

        logger.info("✓ 端口扫描完成 - 发现端口: %d", processed_records)
        user_log(scan_id, "port_scan", f"port_scan completed: found {processed_records} ports")

        executed_tasks = ['export_hosts', 'parse_config']
        executed_tasks.extend([f'run_and_stream_save_ports ({tool})' for tool in tool_stats])

        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': scan_workspace_dir,
            'hosts_file': hosts_file,
            'host_count': host_count,
            'processed_records': processed_records,
            'executed_tasks': executed_tasks,
            'tool_stats': {
                'total': len(tool_stats) + len(failed_tools),
                'successful': len(successful_tool_names),
                'failed': len(failed_tools),
                'successful_tools': successful_tool_names,
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
        logger.exception("端口扫描失败: %s", e)
        raise
