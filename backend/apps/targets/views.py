from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count
from .models import Organization, Target
from .serializers import OrganizationSerializer, TargetSerializer, BatchCreateTargetSerializer
from apps.common.normalizer import normalize_target
from apps.common.validators import detect_target_type


class OrganizationViewSet(viewsets.ModelViewSet):
    """组织管理 - 增删改查"""
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    
    def get_queryset(self):
        """优化查询,预计算目标数量，避免 N+1 查询"""
        return Organization.objects.annotate(
            target_count=Count('targets')
        )
    
    @action(detail=True, methods=['get'])
    def targets(self, request, pk=None):
        """
        获取组织的目标列表
        GET /api/organizations/{id}/targets/?page=1&pageSize=10
        """
        organization = self.get_object()
        
        # 获取组织的目标（优化：使用 prefetch_related 预加载 organizations，避免 N+1 查询）
        queryset = organization.targets.prefetch_related('organizations').all()
        
        # 使用分页器
        paginator = self.paginator
        page = paginator.paginate_queryset(queryset, request, view=self)
        
        if page is not None:
            serializer = TargetSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        # 如果没有分页参数，返回错误
        return Response(
            {'error': '必须提供分页参数 page 和 pageSize'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'])
    def unlink_targets(self, request, pk=None):
        """
        解除组织与目标的关联
        POST /api/organizations/{id}/unlink_targets/
        
        请求格式：
        {
            "target_ids": [1, 2, 3]
        }
        
        返回：
        {
            "unlinked_count": 3,
            "message": "成功解除 3 个目标的关联"
        }
        
        注意：此操作只解除关联关系，不会删除目标本身
        """
        organization = self.get_object()
        target_ids = request.data.get('target_ids', [])
        
        if not target_ids:
            return Response(
                {'error': '目标ID列表不能为空'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(target_ids, list):
            return Response(
                {'error': 'target_ids 必须是数组'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 使用事务保护
        with transaction.atomic():
            # 验证目标是否存在且属于该组织
            existing_targets = organization.targets.filter(id__in=target_ids)
            existing_count = existing_targets.count()
            
            if existing_count == 0:
                return Response(
                    {'error': '未找到要解除关联的目标'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 解除关联
            organization.targets.remove(*existing_targets)
        
        return Response({
            'unlinked_count': existing_count,
            'message': f'成功解除 {existing_count} 个目标的关联'
        })


class TargetViewSet(viewsets.ModelViewSet):
    """
    目标管理 - 增删改查
    
    性能优化说明:
    1. 使用 prefetch_related('organizations') 预加载关联的组织
    2. 配合 TargetSerializer 中的嵌套序列化器 SimpleOrganizationSerializer
    3. 避免 N+1 查询问题：
       - 优化前：100 个目标 = 1 + 100 = 101 次查询
       - 优化后：100 个目标 = 1 + 1 = 2 次查询
    
    ⚠️ 重要：如果在其他地方使用 TargetSerializer，必须确保查询时使用了
    prefetch_related('organizations')，否则仍会产生 N+1 查询
    """
    # 优化：使用 prefetch_related 预加载 organizations，避免 N+1 查询
    queryset = Target.objects.prefetch_related('organizations').all()
    serializer_class = TargetSerializer
    
    @action(detail=False, methods=['post'])
    def batch_create(self, request):
        """
        批量创建目标
        POST /api/targets/batch_create/
        
        请求格式：
        {
            "targets": [
                {"name": "example.com"},
                {"name": "192.168.1.1"},
                {"name": "192.168.1.0/24"}
            ],
            "organization_id": 1  // 可选，关联到指定组织
        }
        
        注意：type 会根据 name 自动检测（域名/IP/CIDR）
        
        返回：
        {
            "created_count": 2,
            "reused_count": 0,
            "failed_count": 0,
            "failed_targets": [
                {"name": "xxx", "reason": "无法识别的目标格式"}
            ],
            "message": "成功创建 2 个目标"
        }
        """
        serializer = BatchCreateTargetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        targets_data = serializer.validated_data['targets']
        organization_id = serializer.validated_data.get('organization_id')
        
        created_targets = []
        reused_targets = []
        failed_targets = []
        
        # 如果指定了组织，先获取组织对象
        organization = None
        if organization_id:
            try:
                organization = Organization.objects.get(id=organization_id)
            except Organization.DoesNotExist:
                return Response(
                    {'error': f'组织 ID {organization_id} 不存在'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # 使用事务确保原子性
        with transaction.atomic():
            for target_data in targets_data:
                name = target_data.get('name')
                
                try:
                    # 1. 规范化
                    normalized_name = normalize_target(name)
                    # 2. 验证并检测类型
                    target_type = detect_target_type(normalized_name)
                except ValueError as e:
                    # 无法识别的格式，记录失败原因
                    failed_targets.append({
                        'name': name,
                        'reason': str(e)
                    })
                    continue
                
                # 3. 写入：如果目标已存在则获取，不存在则创建
                target, created = Target.objects.get_or_create(
                    name=normalized_name,
                    defaults={
                        'type': target_type
                    }
                )
                
                # 如果指定了组织，关联目标到组织
                if organization:
                    organization.targets.add(target)
                
                # 记录创建或复用的目标
                if created:
                    created_targets.append(target)
                else:
                    reused_targets.append(target)
        
        # 构建响应消息
        message_parts = []
        if created_targets:
            message_parts.append(f'成功创建 {len(created_targets)} 个目标')
        if reused_targets:
            message_parts.append(f'复用 {len(reused_targets)} 个已存在的目标')
        if failed_targets:
            message_parts.append(f'失败 {len(failed_targets)} 个目标')
        
        message = '，'.join(message_parts) if message_parts else '无目标被处理'
        
        return Response({
            'created_count': len(created_targets),
            'reused_count': len(reused_targets),
            'failed_count': len(failed_targets),
            'failed_targets': failed_targets,
            'message': message
        }, status=status.HTTP_201_CREATED)