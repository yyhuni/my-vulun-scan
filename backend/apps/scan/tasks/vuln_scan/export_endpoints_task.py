"""导出 Endpoint URL 到文件的 Task

基于 EndpointService.iter_endpoint_urls_by_target 按目标流式导出端点 URL，
用于漏洞扫描（如 Dalfox XSS）的输入文件生成。
支持默认值模式：如果没有 Endpoint，自动使用默认 Endpoint URL
"""

import logging
from pathlib import Path
from typing import Dict

from prefect import task

from apps.asset.services import EndpointService

logger = logging.getLogger(__name__)


@task(name="export_endpoints")
def export_endpoints_task(
    target_id: int,
    output_file: str,
    batch_size: int = 1000,
    target_name: str = None,
) -> Dict[str, object]:
    """导出目标下的所有 Endpoint URL 到文本文件。

    支持默认值模式：如果没有 Endpoint，自动使用默认 Endpoint URL（http(s)://target_name）

    Args:
        target_id: 目标 ID
        output_file: 输出文件路径（绝对路径）
        batch_size: 每次从数据库迭代的批大小
        target_name: 目标名称（用于默认值模式）

    Returns:
        dict: {
            "success": bool,
            "output_file": str,
            "total_count": int,
        }
    """
    try:
        logger.info("开始导出 Endpoint URL - Target ID: %d, 输出文件: %s", target_id, output_file)

        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        service = EndpointService()
        url_iterator = service.iter_endpoint_urls_by_target(target_id, chunk_size=batch_size)

        total_count = 0
        with open(output_path, "w", encoding="utf-8", buffering=8192) as f:
            for url in url_iterator:
                f.write(f"{url}\n")
                total_count += 1

                if total_count % 10000 == 0:
                    logger.info("已导出 %d 个 Endpoint URL...", total_count)

        # ==================== 采用默认 URL：如果没有 Endpoint，使用默认 URL ====================
        # 只写入文件供扫描工具使用，不写入数据库
        # 数据库只存储扫描发现的真实资产
        if total_count == 0 and target_name:
            logger.info("采用默认 Endpoint URL: http(s)://%s (target_id=%d)", target_name, target_id)
            
            # 只写入文件，不写入数据库
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(f"http://{target_name}\n")
                f.write(f"https://{target_name}\n")
            total_count = 2
            
            logger.info("✓ 默认 Endpoint URL 已写入文件: http(s)://%s", target_name)

        logger.info(
            "✓ Endpoint URL 导出完成 - 总数: %d, 文件: %s (%.2f KB)",
            total_count,
            str(output_path),
            output_path.stat().st_size / 1024,
        )

        return {
            "success": True,
            "output_file": str(output_path),
            "total_count": total_count,
        }

    except FileNotFoundError as e:
        logger.error("输出目录不存在: %s", e)
        raise
    except PermissionError as e:
        logger.error("文件写入权限不足: %s", e)
        raise
    except Exception as e:
        logger.exception("导出 Endpoint URL 失败: %s", e)
        raise
