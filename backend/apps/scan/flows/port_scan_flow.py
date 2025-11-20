"""  
端口扫描 Flow

负责编排端口扫描的完整流程

架构：
- Flow 负责编排多个原子 Task
- 支持串行执行扫描工具（流式处理）
- 每个 Task 可独立重试
- 配置由 YAML 解析
"""

# Django 环境初始化（导入即生效）
from apps.common.prefect_django_setup import setup_django_for_prefect

import logging
import os
import subprocess
from pathlib import Path
from typing import Callable
from prefect import flow
from apps.scan.tasks.port_scan import (
    export_domains_task,
    run_and_stream_save_ports_task
)
from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_running,
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_cancelled,
    on_scan_flow_crashed
)
from apps.scan.utils import config_parser, build_scan_command

logger = logging.getLogger(__name__)


def calculate_port_scan_timeout(
    tool_config: dict,
    file_path: str,
    base_per_pair: float = 0.02
) -> int:
    """
    根据目标数量和端口数量计算超时时间
    
    计算公式：超时时间 = 目标数 × 端口数 × base_per_pair
    超时范围：60秒 ~ 2天（172800秒）
    
    Args:
        tool_config: 工具配置字典，包含端口配置（ports, top-ports等）
        file_path: 目标文件路径（域名/IP列表）
        base_per_pair: 每个"端口-目标对"的基础时间（秒），默认 0.02秒
    
    Returns:
        int: 计算出的超时时间（秒），范围：60 ~ 172800
    
    Example:
        # 100个目标 × 100个端口 × 0.02秒 = 200秒
        # 10个目标 × 1000个端口 × 0.02秒 = 200秒
        timeout = calculate_port_scan_timeout(
            tool_config={'top-ports': 100},
            file_path='/path/to/domains.txt'
        )
    """
    try:
        # 1. 统计目标数量
        result = subprocess.run(
            ['wc', '-l', file_path],
            capture_output=True,
            text=True,
            check=True
        )
        target_count = int(result.stdout.strip().split()[0])
        
        # 2. 解析端口数量
        port_count = _parse_port_count(tool_config)
        
        # 3. 计算超时时间
        # 总工作量 = 目标数 × 端口数
        total_work = target_count * port_count
        timeout = int(total_work * base_per_pair)
        
        # 4. 设置合理的上下限
        min_timeout = 60       # 最小 60 秒
        max_timeout = 172800   # 最大 2 天（2 × 24 × 3600）
        timeout = max(min_timeout, min(timeout, max_timeout))
        
        logger.info(
            f"计算端口扫描 timeout - "
            f"目标数: {target_count}, "
            f"端口数: {port_count}, "
            f"总工作量: {total_work}, "
            f"超时: {timeout}秒"
        )
        return timeout
        
    except Exception as e:
        logger.warning(f"计算 timeout 失败: {e}，使用默认值 600秒")
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
    # 1. 检查 top-ports 配置
    if 'top-ports' in tool_config:
        top_ports = tool_config['top-ports']
        if isinstance(top_ports, int) and top_ports > 0:
            return top_ports
        logger.warning(f"top-ports 配置无效: {top_ports}，使用默认值")
    
    # 2. 检查 ports 配置
    if 'ports' in tool_config:
        ports_str = str(tool_config['ports']).strip()
        
        # 2.1 逗号分隔的端口列表：80,443,8080
        if ',' in ports_str:
            port_list = [p.strip() for p in ports_str.split(',') if p.strip()]
            return len(port_list)
        
        # 2.2 端口范围：1-1000
        if '-' in ports_str:
            try:
                start, end = ports_str.split('-', 1)
                start_port = int(start.strip())
                end_port = int(end.strip())
                
                if 1 <= start_port <= end_port <= 65535:
                    return end_port - start_port + 1
                logger.warning(f"端口范围无效: {ports_str}，使用默认值")
            except ValueError:
                logger.warning(f"端口范围解析失败: {ports_str}，使用默认值")
        
        # 2.3 单个端口
        try:
            port = int(ports_str)
            if 1 <= port <= 65535:
                return 1
        except ValueError:
            logger.warning(f"端口配置解析失败: {ports_str}，使用默认值")
    
    # 3. 默认值：naabu 默认扫描 top 100 端口
    return 100


def _setup_port_scan_directory(scan_workspace_dir: str) -> Path:
    """
    创建并验证端口扫描工作目录
    
    Args:
        scan_workspace_dir: 扫描工作空间目录
        
    Returns:
        Path: 端口扫描目录路径
        
    Raises:
        RuntimeError: 目录创建或验证失败
    """
    port_scan_dir = Path(scan_workspace_dir) / 'port_scan'
    port_scan_dir.mkdir(parents=True, exist_ok=True)
    
    if not port_scan_dir.is_dir():
        raise RuntimeError(f"端口扫描目录创建失败: {port_scan_dir}")
    if not os.access(port_scan_dir, os.W_OK):
        raise RuntimeError(f"端口扫描目录不可写: {port_scan_dir}")
    
    return port_scan_dir


def _export_target_domains(target_id: int, port_scan_dir: Path) -> tuple[str, int]:
    """
    导出目标域名到文件
    
    Args:
        target_id: 目标 ID
        port_scan_dir: 端口扫描目录
        
    Returns:
        tuple: (domains_file, domain_count)
        
    Raises:
        ValueError: 域名数量为 0
    """
    logger.info("Step 1: 导出目标域名列表")
    
    domains_file = str(port_scan_dir / 'domains.txt')
    export_result = export_domains_task(
        target_id=target_id,
        output_file=domains_file,
        batch_size=1000  # 每次读取 1000 条，优化内存占用
    )
    
    domain_count = export_result['total_count']
    
    logger.info(
        "✓ 域名导出完成 - 文件: %s, 数量: %d",
        export_result['output_file'],
        domain_count
    )
    
    if domain_count == 0:
        logger.warning("目标下没有域名，无法执行端口扫描")
        # 不抛出异常，由上层决定如何处理
        # raise ValueError("目标下没有域名，无法执行端口扫描")
    
    return domains_file, domain_count


def _run_scans_sequentially(
    enabled_tools: dict,
    domains_file: str,
    port_scan_dir: Path,
    scan_id: int,
    target_id: int,
    target_name: str
) -> tuple[dict, int, list, list]:
    """
    串行执行端口扫描任务
    
    Args:
        enabled_tools: 已启用的工具配置字典
        domains_file: 域名文件路径
        port_scan_dir: 端口扫描目录
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        target_name: 目标名称（用于错误日志）
        
    Returns:
        tuple: (tool_stats, processed_records, successful_tool_names, failed_tools)
        注意：端口扫描是流式输出，不生成结果文件
        
    Raises:
        RuntimeError: 所有工具均失败
    """
    # ==================== 构建命令并串行执行 ====================
    
    tool_stats = {}
    processed_records = 0
    failed_tools = []      # 记录失败的工具（含原因）
    
    for tool_name, tool_config in enabled_tools.items():
        # 1. 构建完整命令（变量替换）
        try:
            command = build_scan_command(
                tool_name=tool_name,
                scan_type='port_scan',
                command_params={
                    'target_file': domains_file  # 对应 {target_file}
                },
                tool_config=tool_config
            )
        except Exception as e:
            reason = f"命令构建失败: {str(e)}"
            logger.error(f"构建 {tool_name} 命令失败: {e}")
            failed_tools.append({'tool': tool_name, 'reason': reason})
            continue
        
        # 2. 获取超时时间（已在 config_parser 中验证）
        config_timeout = tool_config['timeout']
        
        # 2.1 生成日志文件路径（类似子域名扫描）
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        log_file = port_scan_dir / f"{tool_name}_{timestamp}.log"
        
        # 3. 执行扫描任务
        logger.info("开始执行 %s 扫描（超时: %d秒）...", tool_name, config_timeout)
        
        try:
            # 直接调用 task（串行执行）
            # 注意：端口扫描是流式输出到 stdout，不使用 output_file
            result = run_and_stream_save_ports_task(
                cmd=command,
                tool_name=tool_name,  # 工具名称
                scan_id=scan_id,
                target_id=target_id,
                cwd=str(port_scan_dir),
                shell=True,
                batch_size=1000,
                timeout=config_timeout,
                log_file=str(log_file)  # 新增：日志文件路径
            )
            
            tool_stats[tool_name] = {
                'command': command,
                'result': result,
                'timeout': config_timeout
            }
            processed_records += result.get('processed_records', 0)
            logger.info(
                "✓ 工具 %s 流式处理完成 - 记录数: %d",
                tool_name, result.get('processed_records', 0)
            )
            
        except subprocess.TimeoutExpired as exc:
            # 超时异常单独处理
            # 注意：流式处理任务超时时，已解析的数据已保存到数据库
            reason = f"执行超时（配置: {config_timeout}秒）"
            failed_tools.append({'tool': tool_name, 'reason': reason})
            logger.warning(
                "⚠️ 工具 %s 执行超时 - 超时配置: %d秒\n"
                "注意：超时前已解析的端口数据已保存到数据库，但扫描未完全完成。",
                tool_name, config_timeout
            )
        except Exception as exc:
            # 其他异常
            failed_tools.append({'tool': tool_name, 'reason': str(exc)})
            logger.error("工具 %s 执行失败: %s", tool_name, exc, exc_info=True)
    
    if failed_tools:
        logger.warning(
            "以下扫描工具执行失败: %s",
            ', '.join([f['tool'] for f in failed_tools])
        )
    
    if not tool_stats:
        error_details = "\n".join([
            f"  - {f['tool']}: {f['reason']}"
            for f in failed_tools
        ])
        raise RuntimeError(
            f"所有端口扫描工具均失败 - 目标: {target_name}\n"
            f"失败工具:\n{error_details}"
        )
    
    # 动态计算成功的工具列表
    successful_tool_names = [name for name in enabled_tools.keys() 
                              if name not in [f['tool'] for f in failed_tools]]
    
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
    on_cancellation=[on_scan_flow_cancelled],
    on_crashed=[on_scan_flow_crashed]
)
def port_scan_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    engine_config: str
) -> dict:
    """
    端口扫描 Flow
    
    主要功能：
        1. 扫描目标域名的开放端口（核心目标）
        2. 发现域名对应的 IP 地址（附带产物）
        3. 保存 IP 和端口的关联关系
    
    输出资产：
        - Port：开放的端口列表（主要资产）
        - IPAddress：域名对应的 IP 地址（附带资产）
    
    工作流程：
        Step 0: 创建工作目录
        Step 1: 导出域名列表到文件（供扫描工具使用）
        Step 2: 解析配置，获取启用的工具
        Step 3: 串行执行扫描工具，运行端口扫描工具并实时解析输出到数据库（Subdomain → IPAddress → Port）

    Args:
        scan_id: 扫描任务 ID
        target_name: 域名
        target_id: 目标 ID
        scan_workspace_dir: Scan 工作空间目录
        engine_config: 引擎配置（YAML 字符串，必需）

    Returns:
        dict: {
            'success': bool,
            'scan_id': int,
            'target': str,
            'scan_workspace_dir': str,
            'domains_file': str,
            'domain_count': int,
            'processed_records': int,
            'executed_tasks': list,
            'tool_stats': {
                'total': int,                    # 总工具数
                'successful': int,               # 成功工具数
                'failed': int,                   # 失败工具数
                'successful_tools': list[str],   # 成功工具列表 ['naabu_active']
                'failed_tools': list[dict],      # 失败工具列表 [{'tool': 'naabu_passive', 'reason': '超时'}]
                'details': dict                  # 详细执行结果（保留向后兼容）
            }
        }

    Raises:
        ValueError: 配置错误
        RuntimeError: 执行失败
    
    Note:
        端口扫描的输出必然包含 IP 信息，因为：
        - 扫描工具需要解析域名 → IP
        - 端口属于 IP，而不是直接属于域名
        - 同一域名可能对应多个 IP（CDN、负载均衡）
    """
    try:
        # 参数验证
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
            "开始端口扫描\n" +
            f"  Scan ID: {scan_id}\n" +
            f"  Target: {target_name}\n" +
            f"  Workspace: {scan_workspace_dir}\n" +
            "="*60
        )
        
        # Step 0: 创建工作目录
        port_scan_dir = _setup_port_scan_directory(scan_workspace_dir)
        
        # Step 1: 导出目标域名
        domains_file, domain_count = _export_target_domains(target_id, port_scan_dir)
        
        if domain_count == 0:
            logger.warning("目标下没有域名，跳过端口扫描")
            return {
                'success': True,
                'scan_id': scan_id,
                'target': target_name,
                'scan_workspace_dir': scan_workspace_dir,
                'domains_file': domains_file,
                'domain_count': 0,
                'processed_records': 0,
                'executed_tasks': ['export_domains'],
                'tool_stats': {
                    'total': 0,
                    'successful': 0,
                    'failed': 0,
                    'successful_tools': [],
                    'failed_tools': [],
                    'details': {}
                }
            }
        
        # Step 2: 解析配置，获取启用的工具
        logger.info("Step 2: 解析配置，获取启用的工具")
        
        # 解析配置，传入 timeout 计算函数和参数
        # timeout 会根据 目标数 × 端口数 自动计算
        enabled_tools = config_parser.parse_enabled_tools(
            scan_type='port_scan',
            engine_config=engine_config,
            timeout_calculator=calculate_port_scan_timeout,
            timeout_calculator_kwargs={
                'file_path': domains_file,
                # 可选：调整基础速率（默认 0.02秒/端口-目标对）
                # 'base_per_pair': 0.02
            }
        )
        
        if not enabled_tools:
            raise RuntimeError("没有启用的端口扫描工具，请检查引擎配置。")
        
        logger.info(
            "✓ 配置解析完成 - 启用工具: %s",
            ', '.join(enabled_tools.keys())
        )
        
        # Step 3: 串行执行扫描工具
        logger.info("Step 3: 串行执行扫描工具")
        tool_stats, processed_records, successful_tool_names, failed_tools = _run_scans_sequentially(
            enabled_tools=enabled_tools,
            domains_file=domains_file,
            port_scan_dir=port_scan_dir,
            scan_id=scan_id,
            target_id=target_id,
            target_name=target_name
        )
        
        logger.info("="*60 + "\n✓ 端口扫描完成\n" + "="*60)
        
        # 动态生成已执行的任务列表
        executed_tasks = ['export_domains', 'parse_config']
        executed_tasks.extend([f'run_and_stream_save_ports ({tool})' for tool in tool_stats.keys()])
        
        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': scan_workspace_dir,
            'domains_file': domains_file,
            'domain_count': domain_count,
            'processed_records': processed_records,
            'executed_tasks': executed_tasks,
            'tool_stats': {
                'total': len(tool_stats) + len(failed_tools),
                'successful': len(successful_tool_names),
                'failed': len(failed_tools),
                'successful_tools': successful_tool_names,
                'failed_tools': failed_tools,  # [{'tool': 'naabu_active', 'reason': '超时'}]
                'details': tool_stats  # 详细结果（保留向后兼容）
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
