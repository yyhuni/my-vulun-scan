"""
定时扫描任务视图集

独立文件，避免 views.py 文件过大
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
import logging

from ..models import ScheduledScan
from ..serializers import (
    ScheduledScanSerializer, CreateScheduledScanSerializer,
    UpdateScheduledScanSerializer, ToggleScheduledScanSerializer
)
from ..services.scheduled_scan_service import ScheduledScanService
from ..repositories import ScheduledScanDTO
from apps.common.pagination import BasePagination


logger = logging.getLogger(__name__)


class ScheduledScanViewSet(viewsets.ViewSet):
    """
    定时扫描任务视图集
    
    API 端点：
    - GET    /scheduled-scans/           获取定时扫描列表
    - POST   /scheduled-scans/           创建定时扫描
    - GET    /scheduled-scans/{id}/      获取定时扫描详情
    - PUT    /scheduled-scans/{id}/      更新定时扫描
    - DELETE /scheduled-scans/{id}/      删除定时扫描
    - POST   /scheduled-scans/{id}/toggle/   切换启用状态
    - POST   /scheduled-scans/{id}/trigger/  立即触发执行
    """
    
    pagination_class = BasePagination
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.service = ScheduledScanService()
    
    @property
    def paginator(self):
        """延迟初始化分页器"""
        if not hasattr(self, '_paginator'):
            if self.pagination_class is None:
                self._paginator = None
            else:
                self._paginator = self.pagination_class()
        return self._paginator
    
    def list(self, request):
        """
        获取定时扫描任务列表
        
        支持标准分页参数：
        - page: 页码 (必填)
        - pageSize: 每页数量 (必填)
        """
        try:
            # 强制检查分页参数
            if not request.query_params.get('page') or not request.query_params.get('pageSize'):
                return Response(
                    {'error': '必须提供分页参数 page 和 pageSize'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 获取 QuerySet
            queryset = self.service.get_queryset()
            
            # 使用 DRF 标准分页流程
            page = self.paginator.paginate_queryset(queryset, request, view=self)
            
            if page is not None:
                serializer = ScheduledScanSerializer(page, many=True)
                return self.paginator.get_paginated_response(serializer.data)
            
            # 如果不分页（通常不会发生，除非分页配置关闭），返回所有数据
            serializer = ScheduledScanSerializer(queryset, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.exception("获取定时扫描列表失败")
            return Response(
                {'error': '服务器错误，请稍后重试'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def create(self, request):
        """
        创建定时扫描任务
        
        请求体:
        - name: 任务名称
        - engine_id: 扫描引擎 ID
        - target_ids: 目标 ID 列表
        - cron_expression: Cron 表达式（格式：分 时 日 月 周）
        - is_enabled: 是否启用（默认 true）
        """
        serializer = CreateScheduledScanSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            data = serializer.validated_data
            dto = ScheduledScanDTO(
                name=data['name'],
                engine_id=data['engine_id'],
                target_ids=data['target_ids'],
                cron_expression=data.get('cron_expression', '0 2 * * *'),
                is_enabled=data.get('is_enabled', True),
            )
            
            scheduled_scan = self.service.create(dto)
            response_serializer = ScheduledScanSerializer(scheduled_scan)
            
            return Response(
                {
                    'message': f'创建定时扫描任务成功: {scheduled_scan.name}',
                    'scheduled_scan': response_serializer.data
                },
                status=status.HTTP_201_CREATED
            )
            
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.exception("创建定时扫描任务失败")
            return Response(
                {'error': '服务器错误，请稍后重试'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, pk=None):
        """获取定时扫描任务详情"""
        try:
            scheduled_scan = self.service.get_by_id(int(pk))
            if not scheduled_scan:
                return Response(
                    {'error': f'定时扫描任务 ID {pk} 不存在'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = ScheduledScanSerializer(scheduled_scan)
            return Response(serializer.data)
            
        except Exception as e:
            logger.exception("获取定时扫描任务详情失败")
            return Response(
                {'error': '服务器错误，请稍后重试'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, pk=None):
        """更新定时扫描任务"""
        serializer = UpdateScheduledScanSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            data = serializer.validated_data
            dto = ScheduledScanDTO(
                name=data.get('name'),
                engine_id=data.get('engine_id'),
                target_ids=data.get('target_ids'),
                cron_expression=data.get('cron_expression'),
                is_enabled=data.get('is_enabled'),
            )
            
            scheduled_scan = self.service.update(int(pk), dto)
            if not scheduled_scan:
                return Response(
                    {'error': f'定时扫描任务 ID {pk} 不存在'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            response_serializer = ScheduledScanSerializer(scheduled_scan)
            return Response({
                'message': f'更新定时扫描任务成功: {scheduled_scan.name}',
                'scheduled_scan': response_serializer.data
            })
            
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.exception("更新定时扫描任务失败")
            return Response(
                {'error': '服务器错误，请稍后重试'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, pk=None):
        """删除定时扫描任务"""
        try:
            scheduled_scan = self.service.get_by_id(int(pk))
            if not scheduled_scan:
                return Response(
                    {'error': f'定时扫描任务 ID {pk} 不存在'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            name = scheduled_scan.name
            if self.service.delete(int(pk)):
                return Response({
                    'message': f'删除定时扫描任务成功: {name}',
                    'id': pk
                })
            else:
                return Response(
                    {'error': '删除失败'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        except Exception as e:
            logger.exception("删除定时扫描任务失败")
            return Response(
                {'error': '服务器错误，请稍后重试'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """
        切换定时扫描任务的启用状态
        
        请求体:
        - is_enabled: true/false
        """
        serializer = ToggleScheduledScanSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            is_enabled = serializer.validated_data['is_enabled']
            
            if self.service.toggle_enabled(int(pk), is_enabled):
                scheduled_scan = self.service.get_by_id(int(pk))
                response_serializer = ScheduledScanSerializer(scheduled_scan)
                
                status_text = '启用' if is_enabled else '禁用'
                return Response({
                    'message': f'已{status_text}定时扫描任务',
                    'scheduled_scan': response_serializer.data
                })
            else:
                return Response(
                    {'error': f'定时扫描任务 ID {pk} 不存在或操作失败'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
        except Exception as e:
            logger.exception("切换定时扫描任务状态失败")
            return Response(
                {'error': '服务器错误，请稍后重试'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
