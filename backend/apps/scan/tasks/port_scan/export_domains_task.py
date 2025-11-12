"""
导出域名到 TXT 文件的 Task

使用流式处理，避免大量域名导致内存溢出
"""
import logging
from pathlib import Path
from prefect import task
from django.db import transaction

logger = logging.getLogger(__name__)


@task(name="export_domains")
def export_domains_task(
    target_id: int,
    output_file: str,
    batch_size: int = 1000
) -> dict:
    """
    导出目标下的所有域名到 TXT 文件

    使用流式处理，支持大规模数据导出（10万+域名）

    Args:
        target_id: 目标 ID
        output_file: 输出文件路径（绝对路径）
        batch_size: 每次读取的批次大小，默认 1000

    Returns:
        dict: {
            'success': bool,
            'output_file': str,
            'total_count': int
        }

    Raises:
        ValueError: 参数错误
        IOError: 文件写入失败
    """
    try:
        # 延迟导入 Django 模型（避免启动时循环依赖）
        from apps.asset.models import Subdomain

        logger.info("开始导出域名 - Target ID: %d, 输出文件: %s", target_id, output_file)

        # 确保输出目录存在
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # 使用 iterator() 进行流式查询，chunk_size 控制每次从数据库读取的行数
        # only('name') 只查询 name 字段，减少内存占用
        queryset = Subdomain.objects.filter(
            target_id=target_id
        ).only('name').iterator(chunk_size=batch_size)

        # 流式写入文件
        total_count = 0
        with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
            for subdomain in queryset:
                # 每次只处理一个域名，边读边写
                f.write(f"{subdomain.name}\n")
                total_count += 1

                # 每写入 10000 条记录打印一次进度
                if total_count % 10000 == 0:
                    logger.info("已导出 %d 个域名...", total_count)

        logger.info(
            "✓ 域名导出完成 - 总数: %d, 文件: %s (%.2f KB)",
            total_count,
            output_file,
            output_path.stat().st_size / 1024
        )

        return {
            'success': True,
            'output_file': str(output_path),
            'total_count': total_count
        }

    except FileNotFoundError as e:
        logger.error("输出目录不存在: %s", e)
        raise
    except PermissionError as e:
        logger.error("文件写入权限不足: %s", e)
        raise
    except Exception as e:
        logger.exception("导出域名失败: %s", e)
        raise


@task(name="count_domains", retries=2)
def count_domains_task(target_id: int) -> int:
    """
    统计目标下的域名总数

    Args:
        target_id: 目标 ID

    Returns:
        int: 域名总数
    """
    try:
        from apps.asset.models import Subdomain

        count = Subdomain.objects.filter(target_id=target_id).count()
        logger.info("Target %d 的域名总数: %d", target_id, count)
        return count

    except Exception as e:
        logger.exception("统计域名数量失败: %s", e)
        raise
