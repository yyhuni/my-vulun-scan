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
import uuid
from datetime import datetime
from django.conf import settings
from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_running,
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_cancelled,
    on_scan_flow_crashed
)
from apps.scan.utils import build_command
from apps.common.normalizer import normalize_domain
from apps.common.validators import validate_domain

logger = logging.getLogger(__name__)

# 扫描工具配置（在 Flow 层管理）
# 
# 如何添加新工具：
# 1. 在下方字典中添加新的工具配置
# 2. 无需修改其他代码，Flow 会自动并行执行所有配置的工具
# 
# 参数说明：
# - {target}: 目标域名
# - {output_file}: 输出文件路径
# - timeout: 命令执行超时时间（秒）
SCANNER_CONFIGS = {
    'subfinder': {
        'command': 'subfinder -d {target} -o {output_file} -proxy http://proxy:8080 -t 10 -silent',
        'timeout': 600  # 10分钟，使用代理可能较慢
    },
    'amass_passive': {
        'command': 'amass enum -passive -d {target} -o {output_file}',
        'timeout': 600  # 10分钟
    },
    'amass_active': {
        'command': 'amass enum -active -d {target} -o {output_file} -brute -w /usr/src/wordlist/deepmagic.com-prefixes-top50000.txt',
        'timeout': 1800  # 30分钟，主动扫描+暴力破解耗时较长
    },
    'sublist3r': {
        'command': 'python3 /usr/src/github/Sublist3r/sublist3r.py -d {target} -o {output_file} -t 50',
        'timeout': 900  # 15分钟
    },
    'oneforall': {
        'command': 'python3 /usr/src/github/OneForAll/oneforall.py --target {target} run && cut -d\',\' -f6 /usr/src/github/OneForAll/results/{target}.csv | tail -n +2 > {output_file} && rm -rf /usr/src/github/OneForAll/results/{target}.csv',
        'timeout': 1200  # 20分钟，OneForAll 功能全面但耗时
    }
}


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
    engine_config: str = None
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
        engine_config: 引擎配置（预留，暂未使用）
    
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
        result_path = Path(scan_workspace_dir) / 'subdomain_discovery'
        result_path.mkdir(parents=True, exist_ok=True)

        if not result_path.is_dir():
            raise RuntimeError(f"子域名扫描目录创建失败: {result_path}")
        if not os.access(result_path, os.W_OK):
            raise RuntimeError(f"子域名扫描目录不可写: {result_path}")

        result_dir = str(result_path)
        
        logger.info(
            "Step 1: 并行运行扫描工具（%s）",
            ', '.join(SCANNER_CONFIGS.keys())
        )
        
        # 规范化和验证域名
        try:
            normalized_target = normalize_domain(target_name)
            validate_domain(normalized_target)
            logger.debug("域名验证通过: %s -> %s", target_name, normalized_target)
            target_name = normalized_target
        except ValueError as e:
            error_msg = f"无效的目标域名: {target_name} - {e}"
            logger.error(error_msg)
            raise ValueError(error_msg) from e
        
        # 提交并行任务（动态处理所有配置的工具）
        futures = {}
        for tool_name, config in SCANNER_CONFIGS.items():
            # 生成输出文件路径
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            short_uuid = uuid.uuid4().hex[:4]
            output_file = str(result_path / f"{tool_name}_{timestamp}_{short_uuid}.txt")
            
            # 使用统一的命令构建器
            command = build_command(
                template=config['command'],
                target=target_name,
                output_file=output_file
            )
            
            future = run_subdomain_discovery_task.submit(
                tool=tool_name,
                result_dir=result_dir,
                command=command,  # 传递完整命令
                timeout=config['timeout'],
                output_file=output_file  # 传递输出文件路径
            )
            futures[tool_name] = future
        
        # 等待并行任务完成，获取结果
        # 注意：Task 资源由 Prefect 调度器管理，完成后自动释放，不受此处等待影响
        results = {}
        for tool_name, future in futures.items():
            try:
                result = future.result()
                results[tool_name] = result
                logger.info("✓ 扫描工具 %s 执行成功", tool_name)
            except Exception as e:
                logger.warning("⚠️ 扫描工具 %s 执行失败: %s", tool_name, str(e))
                results[tool_name] = None  # 标记为失败
        
        # 过滤掉失败的扫描结果（None表示失败）
        result_files = [result for result in results.values() if result]
        
        if not result_files:
            tool_names = ', '.join(SCANNER_CONFIGS.keys())
            raise RuntimeError(
                f"所有扫描工具均失败 - 目标: {target_name}. "
                f"请检查扫描工具是否正确安装（{tool_names}）"
            )
        
        logger.info(
            "✓ 扫描工具并行执行完成 - 成功: %d/%d",
            len(result_files), len(SCANNER_CONFIGS)
        )
        
        # ==================== Step 2: 合并并去重域名 ====================
        logger.info("Step 2: 合并并去重域名")
        
        merged_file = merge_and_validate_task(
            result_files=result_files,
            result_dir=result_dir
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
        executed_tasks = [f'run_scanner ({tool})' for tool in SCANNER_CONFIGS.keys()]
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
