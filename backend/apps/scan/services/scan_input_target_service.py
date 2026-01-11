"""
扫描输入目标服务

提供 ScanInputTarget 的写入操作。
"""

import logging
from typing import List

from apps.common.validators import detect_input_type
from apps.scan.models import ScanInputTarget

logger = logging.getLogger(__name__)


class ScanInputTargetService:
    """扫描输入目标服务，负责批量写入操作。"""

    BATCH_SIZE = 1000

    def bulk_create(self, scan_id: int, inputs: List[str]) -> int:
        """
        批量创建扫描输入目标

        Args:
            scan_id: 扫描任务 ID
            inputs: 输入字符串列表

        Returns:
            创建的记录数
        """
        if not inputs:
            return 0

        records = []
        for raw_input in inputs:
            value = raw_input.strip()
            if not value:
                continue
            try:
                records.append(ScanInputTarget(
                    scan_id=scan_id,
                    value=value,
                    input_type=detect_input_type(value)
                ))
            except ValueError as e:
                logger.warning("跳过无效输入 '%s': %s", value, e)

        if not records:
            return 0

        ScanInputTarget.objects.bulk_create(records, batch_size=self.BATCH_SIZE)
        logger.info("批量创建 %d 条扫描输入目标 (scan_id=%d)", len(records), scan_id)
        return len(records)
