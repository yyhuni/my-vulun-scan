"""指纹管理基类 ViewSet

提供通用的 CRUD 和批量操作，供 EHole/Goby/Wappalyzer 等子类继承
"""

import json
import logging

from django.http import HttpResponse
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from apps.common.pagination import BasePagination
from apps.common.utils.filter_utils import apply_filters

logger = logging.getLogger(__name__)


class BaseFingerprintViewSet(viewsets.ModelViewSet):
    """指纹管理基类 ViewSet，供 EHole/Goby/Wappalyzer 等子类继承
    
    提供的 API：
    
    标准 CRUD（继承自 ModelViewSet）：
    - GET    /                  列表查询（分页 + 智能过滤）
    - POST   /                  创建单条
    - GET    /{id}/             获取详情
    - PUT    /{id}/             更新
    - DELETE /{id}/             删除
    
    批量操作（本类实现）：
    - POST   /batch_create/     批量创建（JSON body）
    - POST   /import_file/      文件导入（multipart/form-data，适合 10MB+ 大文件）
    - POST   /bulk-delete/      批量删除
    - POST   /delete-all/       删除所有
    - GET    /export/           导出下载
    
    智能过滤语法（filter 参数）：
    - field="value"      模糊匹配（包含）
    - field=="value"     精确匹配
    - 多条件空格分隔     AND 关系
    - || 或 or           OR 关系
    
    子类必须实现：
    - service_class      Service 类
    - parse_import_data  解析导入数据格式
    - get_export_filename 导出文件名
    """
    
    pagination_class = BasePagination
    filter_backends = [filters.OrderingFilter]
    ordering = ['-created_at']
    
    # 子类必须指定
    service_class = None  # Service 类
    
    # 智能过滤字段映射，子类必须覆盖
    FILTER_FIELD_MAPPING = {}
    
    def get_queryset(self):
        """支持智能过滤语法"""
        queryset = super().get_queryset()
        filter_query = self.request.query_params.get('filter', None)
        if filter_query:
            queryset = apply_filters(queryset, filter_query, self.FILTER_FIELD_MAPPING)
        return queryset
    
    def get_service(self):
        """获取 Service 实例"""
        if self.service_class is None:
            raise NotImplementedError("子类必须指定 service_class")
        return self.service_class()
    
    def parse_import_data(self, json_data: dict) -> list:
        """
        解析导入数据，子类必须实现
        
        Args:
            json_data: 解析后的 JSON 数据
            
        Returns:
            list: 指纹数据列表
        """
        raise NotImplementedError("子类必须实现 parse_import_data 方法")
    
    def get_export_filename(self) -> str:
        """
        导出文件名，子类必须实现
        
        Returns:
            str: 文件名
        """
        raise NotImplementedError("子类必须实现 get_export_filename 方法")

    @action(detail=False, methods=['post'])
    def batch_create(self, request):
        """
        批量创建指纹规则
        POST /api/engine/fingerprints/{type}/batch_create/
        
        请求格式：
        {
            "fingerprints": [
                {"cms": "WordPress", "method": "keyword", ...},
                ...
            ]
        }
        
        返回：
        {
            "created": 2,
            "failed": 0
        }
        """
        fingerprints = request.data.get('fingerprints', [])
        if not fingerprints:
            raise ValidationError('fingerprints 不能为空')
        if not isinstance(fingerprints, list):
            raise ValidationError('fingerprints 必须是数组')
        
        result = self.get_service().batch_create_fingerprints(fingerprints)
        return Response(result, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def import_file(self, request):
        """
        文件导入（适合大文件，10MB+）
        POST /api/engine/fingerprints/{type}/import_file/
        
        请求格式：multipart/form-data
        - file: JSON 文件
        
        返回：同 batch_create
        """
        file = request.FILES.get('file')
        if not file:
            raise ValidationError('缺少文件')
        
        try:
            json_data = json.load(file)
        except json.JSONDecodeError as e:
            raise ValidationError(f'无效的 JSON 格式: {e}')
        
        fingerprints = self.parse_import_data(json_data)
        if not fingerprints:
            raise ValidationError('文件中没有有效的指纹数据')
        
        result = self.get_service().batch_create_fingerprints(fingerprints)
        return Response(result, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        批量删除
        POST /api/engine/fingerprints/{type}/bulk-delete/
        
        请求格式：{"ids": [1, 2, 3]}
        返回：{"deleted": 3}
        """
        ids = request.data.get('ids', [])
        if not ids:
            raise ValidationError('ids 不能为空')
        if not isinstance(ids, list):
            raise ValidationError('ids 必须是数组')
        
        deleted_count = self.queryset.model.objects.filter(id__in=ids).delete()[0]
        return Response({'deleted': deleted_count})
    
    @action(detail=False, methods=['post'], url_path='delete-all')
    def delete_all(self, request):
        """
        删除所有指纹
        POST /api/engine/fingerprints/{type}/delete-all/
        
        返回：{"deleted": 1000}
        """
        deleted_count = self.queryset.model.objects.all().delete()[0]
        return Response({'deleted': deleted_count})
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """
        导出指纹（前端下载）
        GET /api/engine/fingerprints/{type}/export/
        
        返回：JSON 文件下载
        """
        data = self.get_service().get_export_data()
        content = json.dumps(data, ensure_ascii=False, indent=2)
        response = HttpResponse(content, content_type='application/json')
        response['Content-Disposition'] = f'attachment; filename="{self.get_export_filename()}"'
        return response
