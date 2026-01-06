"""
定时扫描任务视图集

独立文件，避免 views.py 文件过大
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter
from django.core.exceptions import ValidationError
import logging

from ..models import ScheduledScan
from ..serializers import (
    ScheduledScanSerializer, CreateScheduledScanSerializer,
    UpdateScheduledScanSerializer, ToggleScheduledScanSerializer
)
from ..services.scheduled_scan_service import ScheduledScanService
from ..repositories import ScheduledScanDTO
from ..utils.config_merger import ConfigConflictError
from apps.common.pagination import BasePagination
from apps.common.response_helpers import success_response, error_response
from apps.common.error_codes import ErrorCodes


logger = logging.getLogger(__name__)


class ScheduledScanViewSet(viewsets.ModelViewSet):
    """
    定时扫描任务视图集
    
    API 端点：
    - GET    /scheduled-scans/           获取定时扫描列表
    - POST   /scheduled-scans/           创建定时扫描
    - GET    /scheduled-scans/{id}/      获取定时扫描详情
    - PUT    /scheduled-scans/{id}/      更新定时扫描
    - DELETE /scheduled-scans/{id}/      删除定时扫描
    - POST   /scheduled-scans/{id}/toggle/   切换启用状态
    
    查询参数：
    - target_id: 按目标 ID 过滤
    - organization_id: 按组织 ID 过滤
    - search: 按名称搜索
    """
    
    queryset = ScheduledScan.objects.all().order_by('-created_at')
    serializer_class = ScheduledScanSerializer
    pagination_class = BasePagination
    filter_backends = [SearchFilter]
    search_fields = ['name']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.service = ScheduledScanService()
    
    def get_queryset(self):
        """支持按 target_id 和 organization_id 过滤"""
        queryset = super().get_queryset()
        target_id = self.request.query_params.get('target_id')
        organization_id = self.request.query_params.get('organization_id')
        
        if target_id:
            queryset = queryset.filter(target_id=target_id)
        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)
        
        return queryset
    
    def get_serializer_class(self):
        """根据 action 返回不同的序列化器"""
        if self.action == 'create':
            return CreateScheduledScanSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateScheduledScanSerializer
        elif self.action == 'toggle':
            return ToggleScheduledScanSerializer
        return ScheduledScanSerializer
    
    def create(self, request, *args, **kwargs):
        """创建定时扫描任务"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            data = serializer.validated_data
            dto = ScheduledScanDTO(
                name=data['name'],
                engine_ids=data.get('engine_ids', []),
                engine_names=data.get('engine_names', []),
                yaml_configuration=data['configuration'],
                organization_id=data.get('organization_id'),
                target_id=data.get('target_id'),
                cron_expression=data.get('cron_expression', '0 2 * * *'),
                is_enabled=data.get('is_enabled', True),
            )
            
            scheduled_scan = self.service.create_with_configuration(dto)
            response_serializer = ScheduledScanSerializer(scheduled_scan)
            
            return success_response(
                data=response_serializer.data,
                status_code=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            return error_response(
                code=ErrorCodes.VALIDATION_ERROR,
                message=str(e),
                status_code=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        """更新定时扫描任务"""
        instance = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            data = serializer.validated_data
            dto = ScheduledScanDTO(
                name=data.get('name'),
                engine_ids=data.get('engine_ids'),
                organization_id=data.get('organization_id'),
                target_id=data.get('target_id'),
                cron_expression=data.get('cron_expression'),
                is_enabled=data.get('is_enabled'),
            )
            
            scheduled_scan = self.service.update(instance.id, dto)
            response_serializer = ScheduledScanSerializer(scheduled_scan)
            
            return success_response(data=response_serializer.data)
        except ConfigConflictError as e:
            return error_response(
                code='CONFIG_CONFLICT',
                message=str(e),
                details=[
                    {'key': k, 'engines': [e1, e2]} 
                    for k, e1, e2 in e.conflicts
                ],
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except ValidationError as e:
            return error_response(
                code=ErrorCodes.VALIDATION_ERROR,
                message=str(e),
                status_code=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        """删除定时扫描任务"""
        instance = self.get_object()
        scan_id = instance.id
        name = instance.name
        
        if self.service.delete(scan_id):
            return success_response(data={'id': scan_id, 'name': name})
        return error_response(
            code=ErrorCodes.SERVER_ERROR,
            message='Failed to delete scheduled scan',
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """切换定时扫描任务的启用状态"""
        serializer = ToggleScheduledScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        is_enabled = serializer.validated_data['is_enabled']
        
        if self.service.toggle_enabled(int(pk), is_enabled):
            scheduled_scan = self.get_object()
            response_serializer = ScheduledScanSerializer(scheduled_scan)
            
            return success_response(data=response_serializer.data)
        
        return error_response(
            code=ErrorCodes.NOT_FOUND,
            message=f'Scheduled scan with ID {pk} not found or operation failed',
            status_code=status.HTTP_404_NOT_FOUND
        )
    
