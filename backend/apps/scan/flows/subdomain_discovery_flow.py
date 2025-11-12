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
from django.conf import settings

logger = logging.getLogger(__name__)

# 扫描工具配置（在 Flow 层管理）
# 
# 如何添加新工具：
# 1. 在下方字典中添加新的工具配置
# 2. 无需修改其他代码，Flow 会自动并行执行所有配置的工具
# 
# 示例：
# 'assetfinder': {
#     'command': 'assetfinder --subs-only {target} > {output_file}',
#     'timeout': 1200
# }
SCANNER_CONFIGS = {
    'amass': {
        'command': 'amass enum -passive -d {target} -o {output_file}',
        'timeout': 360
    },
    'subfinder': {
        'command': 'subfinder -d {target} -o {output_file}',
        'timeout': 360
    },
    'test_tool_not_found': {
        'command': 'echo1 "test" > {output_file}',  # 命令不存在，返回状态码127
        'timeout': 60
    },
    'test_tool_timeout': {
        'command': 'sleep 100',  # 睡眠100秒，触发超时异常
        'timeout': 1  # 1秒后超时
    },
    'test_tool_syntax_error': {
        'command': 'bash -c "syntax error',  # 语法错误的命令
        'timeout': 60
    }
}


@flow(name="subdomain_discovery", log_prints=True)
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
            run_scanner_task,
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
        
        # 提交并行任务（动态处理所有配置的工具）
        futures = {}
        for tool_name, config in SCANNER_CONFIGS.items():
            future = run_scanner_task.submit(
                tool=tool_name,
                target=target_name,
                result_dir=result_dir,  # 传递结果目录路径
                command=config['command'],
                timeout=config['timeout']
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
