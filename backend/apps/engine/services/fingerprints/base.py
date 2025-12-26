"""指纹管理基类 Service

提供通用的批量操作和缓存逻辑，供 EHole/Goby/Wappalyzer 等子类继承
"""

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)


class BaseFingerprintService:
    """指纹管理基类 Service，提供通用的批量操作和缓存逻辑"""
    
    model = None  # 子类必须指定
    BATCH_SIZE = 1000  # 每批处理数量
    
    def validate_fingerprint(self, item: dict) -> bool:
        """
        校验单条指纹，子类必须实现
        
        Args:
            item: 单条指纹数据
            
        Returns:
            bool: 是否有效
        """
        raise NotImplementedError("子类必须实现 validate_fingerprint 方法")
    
    def validate_fingerprints(self, raw_data: list) -> tuple[list, list]:
        """
        批量校验指纹数据
        
        Args:
            raw_data: 原始指纹数据列表
            
        Returns:
            tuple: (valid_items, invalid_items)
        """
        valid, invalid = [], []
        for item in raw_data:
            if self.validate_fingerprint(item):
                valid.append(item)
            else:
                invalid.append(item)
        return valid, invalid
    
    def to_model_data(self, item: dict) -> dict:
        """
        转换为 Model 字段，子类必须实现
        
        Args:
            item: 原始指纹数据
            
        Returns:
            dict: Model 字段数据
        """
        raise NotImplementedError("子类必须实现 to_model_data 方法")

    def bulk_create(self, fingerprints: list) -> int:
        """
        批量创建指纹记录（已校验的数据）
        
        Args:
            fingerprints: 已校验的指纹数据列表
            
        Returns:
            int: 成功创建数量
        """
        if not fingerprints:
            return 0
        
        objects = [self.model(**self.to_model_data(item)) for item in fingerprints]
        created = self.model.objects.bulk_create(objects, ignore_conflicts=True)
        return len(created)
    
    def batch_create_fingerprints(self, raw_data: list) -> dict:
        """
        完整流程：分批校验 + 批量创建
        
        Args:
            raw_data: 原始指纹数据列表
            
        Returns:
            dict: {'created': int, 'failed': int}
        """
        total_created = 0
        total_failed = 0
        
        for i in range(0, len(raw_data), self.BATCH_SIZE):
            batch = raw_data[i:i + self.BATCH_SIZE]
            valid, invalid = self.validate_fingerprints(batch)
            total_created += self.bulk_create(valid)
            total_failed += len(invalid)
        
        logger.info(
            "批量创建指纹完成: created=%d, failed=%d, total=%d",
            total_created, total_failed, len(raw_data)
        )
        return {'created': total_created, 'failed': total_failed}
    
    def get_export_data(self) -> dict:
        """
        获取导出数据，子类必须实现
        
        Returns:
            dict: 导出的 JSON 数据
        """
        raise NotImplementedError("子类必须实现 get_export_data 方法")
    
    def export_to_file(self, output_path: str) -> str:
        """
        导出所有指纹到 JSON 文件
        
        Args:
            output_path: 输出文件路径
            
        Returns:
            str: 导出的文件路径
        """
        data = self.get_export_data()
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        logger.info("导出指纹文件: %s", output_path)
        return output_path
    
    def get_fingerprint_version(self) -> str:
        """
        获取指纹库版本标识（用于缓存校验）
        
        Returns:
            str: 版本标识，格式 "{count}_{latest_timestamp}"
        
        版本变化场景：
        - 新增记录 → count 变化
        - 删除记录 → count 变化
        - 清空全部 → count 变为 0
        """
        count = self.model.objects.count()
        latest = self.model.objects.order_by('-created_at').first()
        latest_ts = int(latest.created_at.timestamp()) if latest else 0
        return f"{count}_{latest_ts}"
