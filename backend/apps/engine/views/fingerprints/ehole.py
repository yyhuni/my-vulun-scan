"""EHole 指纹管理 ViewSet"""

from apps.common.pagination import BasePagination
from apps.engine.models import EholeFingerprint
from apps.engine.serializers.fingerprints import EholeFingerprintSerializer
from apps.engine.services.fingerprints import EholeFingerprintService

from .base import BaseFingerprintViewSet


class EholeFingerprintViewSet(BaseFingerprintViewSet):
    """EHole 指纹管理 ViewSet
    
    继承自 BaseFingerprintViewSet，提供以下 API：
    
    标准 CRUD（ModelViewSet）：
    - GET    /                  列表查询（分页）
    - POST   /                  创建单条
    - GET    /{id}/             获取详情
    - PUT    /{id}/             更新
    - DELETE /{id}/             删除
    
    批量操作（继承自基类）：
    - POST   /batch_create/     批量创建（JSON body）
    - POST   /import_file/      文件导入（multipart/form-data）
    - POST   /bulk-delete/      批量删除
    - POST   /delete-all/       删除所有
    - GET    /export/           导出下载
    
    智能过滤语法（filter 参数）：
    - cms="word"         模糊匹配 cms 字段
    - cms=="WordPress"   精确匹配
    - type="CMS"         按类型筛选
    - method="keyword"   按匹配方式筛选
    - location="body"    按匹配位置筛选
    """
    
    queryset = EholeFingerprint.objects.all()
    serializer_class = EholeFingerprintSerializer
    pagination_class = BasePagination
    service_class = EholeFingerprintService
    
    # 排序配置
    ordering_fields = ['created_at', 'cms']
    ordering = ['-created_at']
    
    # EHole 过滤字段映射
    FILTER_FIELD_MAPPING = {
        'cms': 'cms',
        'method': 'method',
        'location': 'location',
        'type': 'type',
    }
    
    def parse_import_data(self, json_data: dict) -> list:
        """
        解析 EHole JSON 格式的导入数据
        
        输入格式：{"fingerprint": [...]}
        返回：指纹列表
        """
        return json_data.get('fingerprint', [])
    
    def get_export_filename(self) -> str:
        """导出文件名"""
        return 'ehole.json'
