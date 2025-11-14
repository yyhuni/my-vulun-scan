import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
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


logger = logging.getLogger(__name__)

PORT_SCANNER_CONFIGS = {
    'naabu': {
        'command': 'naabu -exclude-cdn -top-ports 100 -c 30 -rate 150 -timeout 50 -list {target_file} -o {output_file} -json',
        'timeout': 1200
    }
}

def calculate_timeout(domain_count: int) -> int:
    """
    根据域名数量动态计算扫描超时时间。

    规则：
    - 基础时间 base = 300 秒（5 分钟）
    - 每个域名额外增加 per_domain = 1 秒
    - 不设置最大上限（大量域名情况下允许更长超时，由外层流程兜底）

    返回值为上述规则计算结果。
    """
    base = 300
    per_domain = 1
    return base + int(domain_count * per_domain)

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
        Step 1: 导出域名列表到文件（供扫描工具使用）
        Step 2: 并行运行端口扫描工具并实时解析输出
        Step 3: 流式保存到数据库（Subdomain → IPAddress → Port）

    Args:
        scan_id: 扫描任务 ID
        target_name: 域名
        target_id: 目标 ID
        scan_workspace_dir: Scan 工作空间目录
        engine_config: 引擎配置（预留，暂未使用）

    Returns:
        dict: {
            'success': bool,
            'scan_id': int,
            'target': str,
            'scan_workspace_dir': str,
            'domains_file': str,
            'domain_count': int,
            'result_files': list,
            'processed_records': int,
            'executed_tasks': list
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
        logger.info(
            "="*60 + "\n" +
            "开始端口扫描\n" +
            f"  Scan ID: {scan_id}\n" +
            f"  Target: {target_name}\n" +
            f"  Workspace: {scan_workspace_dir}\n" +
            "="*60
        )
        
        # 创建端口扫描工作目录
        port_scan_dir = Path(scan_workspace_dir) / 'port_scan'
        port_scan_dir.mkdir(parents=True, exist_ok=True)

        if not port_scan_dir.is_dir():
            raise RuntimeError(f"端口扫描目录创建失败: {port_scan_dir}")
        if not os.access(port_scan_dir, os.W_OK):
            raise RuntimeError(f"端口扫描目录不可写: {port_scan_dir}")
        
        # ==================== Step 1: 导出目标域名到 TXT 文件 ====================
        logger.info("Step 1: 导出目标域名列表")
        
        # 导出域名到文件（同时获取数量）
        domains_file = str(port_scan_dir / 'domains.txt')
        export_result = export_domains_task(
            target_id=target_id,
            output_file=domains_file,
            batch_size=1000  # 每次读取 1000 条，优化内存占用
        )
        
        # 从导出结果中获取域名数量
        domain_count = export_result['total_count']
        
        logger.info(
            "✓ 域名导出完成 - 文件: %s, 数量: %d",
            export_result['output_file'],
            domain_count
        )
        
        # 动态计算端口扫描超时时间（根据域名数量）
        dynamic_timeout = calculate_timeout(domain_count)
        logger.info("动态计算超时时间: %d 秒（基于域名数量 %d）", dynamic_timeout, domain_count)
        
        # 检查域名数量
        if domain_count == 0:
            logger.warning("目标下没有域名，无法执行端口扫描")
            raise ValueError("目标下没有域名，无法执行端口扫描")
        
        # ==================== Step 2 & 3: 流式执行并实时保存 ====================
        logger.info(
            "Step 2 & 3: 流式执行端口扫描并实时保存结果（%s）",
            ', '.join(PORT_SCANNER_CONFIGS.keys())
        )
        
        futures = {}
        for tool_name, config in PORT_SCANNER_CONFIGS.items():
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            short_uuid = uuid.uuid4().hex[:4]
            output_file = str(port_scan_dir / f"{tool_name}_{timestamp}_{short_uuid}.jsonl")
            command = config['command'].format(
                target_file=domains_file,
                output_file=output_file
            )
            future = run_and_stream_save_ports_task.submit(
                cmd=command,
                scan_id=scan_id,
                target_id=target_id,
                cwd=str(port_scan_dir),
                shell=True,
                batch_size=500
            )
            futures[tool_name] = {
                'future': future,
                'output_file': output_file,
                'command': command
            }
        
        processed_records = 0
        result_files = []
        failed_tools = []
        tool_stats = {}
        
        for tool_name, task_info in futures.items():
            try:
                result = task_info['future'].result()
                tool_stats[tool_name] = {
                    'command': task_info['command'],
                    'output_file': task_info['output_file'],
                    'result': result
                }
                processed_records += result.get('processed_records', 0)
                result_files.append(task_info['output_file'])
                logger.info(
                    "✓ 工具 %s 流式处理完成 - 记录数: %d",
                    tool_name, result.get('processed_records', 0)
                )
            except Exception as exc:
                failed_tools.append(tool_name)
                logger.error("工具 %s 执行失败: %s", tool_name, exc)
        
        if failed_tools:
            logger.warning("以下扫描工具执行失败: %s", ', '.join(failed_tools))
        
        if not tool_stats:
            error_details = "\n".join([
                f"  - {tool}: 流式处理失败"
                for tool in failed_tools
            ])
            raise RuntimeError(
                f"所有端口扫描工具均失败 - 目标: {target_name}\n"
                f"失败工具:\n{error_details}"
            )
        
        logger.info(
            "✓ 流式端口扫描执行完成 - 成功: %d/%d",
            len(tool_stats), len(PORT_SCANNER_CONFIGS)
        )
        
        logger.info("="*60 + "\n✓ 端口扫描完成\n" + "="*60)
        
        # 动态生成已执行的任务列表
        executed_tasks = ['export_domains']
        executed_tasks.extend([f'run_and_stream_save_ports ({tool})' for tool in tool_stats.keys()])
        
        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': scan_workspace_dir,
            'domains_file': export_result['output_file'],
            'domain_count': export_result['total_count'],
            'result_files': result_files,
            'processed_records': processed_records,
            'executed_tasks': executed_tasks,
            'tool_stats': tool_stats
        }

    except Exception as e:
        logger.exception("端口扫描失败: %s", e)
        raise
