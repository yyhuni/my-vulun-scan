
import logging
import os
from pathlib import Path
from prefect import flow
from apps.scan.tasks.directory_enumeration import (
    export_sites_task,
)
from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_running,
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_cancelled,
    on_scan_flow_crashed
)


logger = logging.getLogger(__name__)


@flow(
    name="directory_enumeration", 
    log_prints=True,
    on_running=[on_scan_flow_running],
    on_completion=[on_scan_flow_completed],
    on_failure=[on_scan_flow_failed],
    on_cancellation=[on_scan_flow_cancelled],
    on_crashed=[on_scan_flow_crashed]
)
def directory_enumeration_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    engine_config: str
) -> dict:
    """
    目录枚举扫描 Flow
    
    主要功能：
        1. 扫描站点的目录和文件结构（核心目标）
        2. 发现隐藏的目录和敏感文件
        3. 保存发现的目录和文件信息
    
    输出资产：
        - Directory：发现的目录列表（主要资产）
        - File：发现的文件列表（主要资产）
    
    工作流程：
        Step 1: 导出站点 URL 列表到文件（供扫描工具使用）
        Step 2: 运行目录探测工具（ffuf 等）
        Step 3: 解析扫描结果（JSON 格式）
        Step 4: 流式保存到数据库（Endpoint 表）

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
            'sites_file': str,
            'site_count': int,
            'result_files': list,
            'processed_records': int,
            'executed_tasks': list
        }

    Raises:
        ValueError: 配置错误
        RuntimeError: 执行失败
    
    Note:
        目录枚举扫描需要基于已发现的站点进行：
        - 站点 URL 是目录扫描的基础输入
        - 每个站点可能有不同的目录结构
        - 需要对每个站点分别进行目录枚举
    """
    try: 
        logger.info(
            "="*60 + "\n" +
            "开始目录枚举扫描\n" +
            f"  Scan ID: {scan_id}\n" +
            f"  Target: {target_name}\n" +
            f"  Workspace: {scan_workspace_dir}\n" +
            "="*60
        )
        
        # 创建目录枚举工作目录
        dir_enum_dir = Path(scan_workspace_dir) / 'directory_enumeration'
        dir_enum_dir.mkdir(parents=True, exist_ok=True)

        if not dir_enum_dir.is_dir():
            raise RuntimeError(f"目录枚举扫描目录创建失败: {dir_enum_dir}")
        if not os.access(dir_enum_dir, os.W_OK):
            raise RuntimeError(f"目录枚举扫描目录不可写: {dir_enum_dir}")
        
        # ==================== Step 1: 导出站点 URL 到 TXT 文件 ====================
        logger.info("Step 1: 导出站点 URL 列表")
        
        # 导出站点 URL 到文件（同时获取数量）
        sites_file = str(dir_enum_dir / 'sites.txt')
        export_result = export_sites_task(
            target_id=target_id,
            output_file=sites_file,
            batch_size=1000  # 每次读取 1000 条，优化内存占用
        )
        
        # 从导出结果中获取站点数量
        site_count = export_result['total_count']
        
        logger.info(
            "✓ 站点 URL 导出完成 - 文件: %s, 数量: %d",
            export_result['output_file'],
            site_count
        )
        
        # 检查站点数量
        if site_count == 0:
            logger.warning("目标下没有站点，无法执行目录枚举扫描")
            raise ValueError("目标下没有站点，无法执行目录枚举扫描")
        
        # TODO: Step 2, 3, 4 will be implemented later
        logger.info("Step 2-4: 运行目录扫描工具、解析结果、保存数据库 - 待实现")
        
        logger.info("="*60 + "\n✓ 目录枚举扫描第一步完成\n" + "="*60)
        
        # 当前已执行的任务列表
        executed_tasks = ['export_sites']
        
        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': scan_workspace_dir,
            'sites_file': export_result['output_file'],
            'site_count': export_result['total_count'],
            'result_files': [],  # 暂时为空，后续步骤实现后填充
            'processed_records': 0,  # 暂时为0，后续步骤实现后填充
            'executed_tasks': executed_tasks
        }

    except Exception as e:
        logger.exception("目录枚举扫描失败: %s", e)
        raise