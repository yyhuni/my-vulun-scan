import logging
import os
from pathlib import Path
from prefect import flow
from apps.scan.tasks.port_scan import (
    export_domains_task,
    run_port_scanner_task,
    parse_naabu_result_task,
    save_ports_task
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

@flow(name="port_scan", log_prints=True)
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
        Step 2: 并行运行端口扫描工具（naabu 等）
        Step 3: 解析扫描结果（JSONL 格式）
        Step 4: 流式保存到数据库（Subdomain → IPAddress → Port）

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
        
        # ==================== Step 2: 并行运行端口扫描工具 ====================
        logger.info(
            "Step 2: 并行运行端口扫描工具（%s）",
            ', '.join(PORT_SCANNER_CONFIGS.keys())
        )
        
        # 提交并行任务（动态处理所有配置的工具）
        futures = {}
        for tool_name, config in PORT_SCANNER_CONFIGS.items():
            future = run_port_scanner_task.submit(
                tool=tool_name,
                target_file=domains_file,
                result_dir=str(port_scan_dir),
                command=config['command'],
                timeout=dynamic_timeout
            )
            futures[tool_name] = future
        
        # 等待并行任务完成，获取结果
        results = {tool_name: future.result() for tool_name, future in futures.items()}
        
        # 过滤掉失败的扫描结果（空字符串表示失败）
        result_files = [result for result in results.values() if result]
        failed_tools = [tool for tool, result in results.items() if not result]
        
        # 记录失败的工具
        if failed_tools:
            logger.warning(
                "以下扫描工具执行失败: %s",
                ', '.join(failed_tools)
            )
        
        if not result_files:
            tool_names = ', '.join(PORT_SCANNER_CONFIGS.keys())
            error_details = "\n".join([
                f"  - {tool}: {results.get(tool, 'unknown error')}"
                for tool in failed_tools
            ])
            raise RuntimeError(
                f"所有端口扫描工具均失败 - 目标: {target_name}\n"
                f"失败工具:\n{error_details}\n"
                f"请检查: 1) 工具是否安装（{tool_names}） 2) 网络连接 3) 目标是否可达"
            )
        
        logger.info(
            "✓ 端口扫描工具并行执行完成 - 成功: %d/%d",
            len(result_files), len(PORT_SCANNER_CONFIGS)
        )
        
        # ==================== Step 3: 解析扫描结果 ====================
        logger.info("Step 3: 解析扫描结果")
        
        # 调用解析 Task，返回生成器
        data_generator = parse_naabu_result_task(result_files=result_files)
        
        logger.info("✓ 解析 Task 已创建（生成器模式）")
        
        # ==================== Step 4: 保存到数据库 ====================
        logger.info("Step 4: 流式保存到数据库")
        
        # 将生成器传递给保存 Task，实现流式处理
        save_result = save_ports_task(
            data_generator=data_generator,
            scan_id=scan_id,
            target_id=target_id,
            batch_size=500  # 每批 500 条，平衡性能和内存
        )
        
        logger.info(
            "✓ 保存完成 - 处理记录: %d",
            save_result['processed_records']
        )
        
        logger.info("="*60 + "\n✓ 端口扫描完成\n" + "="*60)
        
        # 动态生成已执行的任务列表
        executed_tasks = ['export_domains']
        executed_tasks.extend([f'run_port_scanner ({tool})' for tool in PORT_SCANNER_CONFIGS.keys()])
        executed_tasks.extend(['parse_naabu_result', 'save_ports'])
        
        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': scan_workspace_dir,
            'domains_file': export_result['output_file'],
            'domain_count': export_result['total_count'],
            'result_files': result_files,
            'processed_records': save_result['processed_records'],
            'executed_tasks': executed_tasks
        }

    except Exception as e:
        logger.exception("端口扫描失败: %s", e)
        raise
