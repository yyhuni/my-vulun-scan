"""EHole 指纹管理 Service

实现 EHole 格式指纹的校验、转换和导出逻辑
"""

from apps.engine.models import EholeFingerprint
from .base import BaseFingerprintService


class EholeFingerprintService(BaseFingerprintService):
    """EHole 指纹管理服务（继承基类，实现 EHole 特定逻辑）"""
    
    model = EholeFingerprint
    
    def validate_fingerprint(self, item: dict) -> bool:
        """
        校验单条 EHole 指纹
        
        校验规则：
        - cms 字段必须存在且非空
        - keyword 字段必须是数组
        
        Args:
            item: 单条指纹数据
            
        Returns:
            bool: 是否有效
        """
        cms = item.get('cms', '')
        keyword = item.get('keyword')
        return bool(cms and str(cms).strip()) and isinstance(keyword, list)
    
    def to_model_data(self, item: dict) -> dict:
        """
        转换 EHole JSON 格式为 Model 字段
        
        字段映射：
        - isImportant (JSON) → is_important (Model)
        
        Args:
            item: 原始 EHole JSON 数据
            
        Returns:
            dict: Model 字段数据
        """
        return {
            'cms': str(item.get('cms', '')).strip(),
            'method': item.get('method', 'keyword'),
            'location': item.get('location', 'body'),
            'keyword': item.get('keyword', []),
            'is_important': item.get('isImportant', False),
            'type': item.get('type', '-'),
        }
    
    def get_export_data(self) -> dict:
        """
        获取导出数据（EHole JSON 格式）
        
        Returns:
            dict: EHole 格式的 JSON 数据
            {
                "fingerprint": [
                    {"cms": "...", "method": "...", "location": "...", 
                     "keyword": [...], "isImportant": false, "type": "..."},
                    ...
                ],
                "version": "1000_1703836800"
            }
        """
        fingerprints = self.model.objects.all()
        data = []
        for fp in fingerprints:
            data.append({
                'cms': fp.cms,
                'method': fp.method,
                'location': fp.location,
                'keyword': fp.keyword,
                'isImportant': fp.is_important,  # 转回 JSON 格式
                'type': fp.type,
            })
        return {
            'fingerprint': data,
            'version': self.get_fingerprint_version(),
        }
