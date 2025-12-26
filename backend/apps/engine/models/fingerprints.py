"""指纹相关 Models

包含 EHole、Goby、Wappalyzer 等指纹格式的数据模型
"""

from django.db import models


class EholeFingerprint(models.Model):
    """EHole 格式指纹规则（字段与 ehole.json 一致）"""
    
    cms = models.CharField(max_length=200, help_text='产品/CMS名称')
    method = models.CharField(max_length=200, default='keyword', help_text='匹配方式')
    location = models.CharField(max_length=200, default='body', help_text='匹配位置')
    keyword = models.JSONField(default=list, help_text='关键词列表')
    is_important = models.BooleanField(default=False, help_text='是否重点资产')
    type = models.CharField(max_length=100, blank=True, default='-', help_text='分类')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'ehole_fingerprint'
        verbose_name = 'EHole 指纹'
        verbose_name_plural = 'EHole 指纹'
        ordering = ['-created_at']
        indexes = [
            # 搜索过滤字段索引
            models.Index(fields=['cms']),
            models.Index(fields=['method']),
            models.Index(fields=['location']),
            models.Index(fields=['type']),
            # 排序字段索引
            models.Index(fields=['-created_at']),
        ]
        constraints = [
            # 唯一约束：cms + method + location 组合不能重复
            models.UniqueConstraint(
                fields=['cms', 'method', 'location'],
                name='unique_ehole_fingerprint'
            ),
        ]
    
    def __str__(self) -> str:
        return f"{self.cms} ({self.method}@{self.location})"
