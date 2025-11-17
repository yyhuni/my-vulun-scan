import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count
from .models import Organization, Target
from .serializers import OrganizationSerializer, TargetSerializer, TargetDetailSerializer, BatchCreateTargetSerializer
from .tasks import async_bulk_delete_targets, async_bulk_delete_organizations
from .services.target_service import TargetService
from .services.organization_service import OrganizationService
from apps.common.normalizer import normalize_target
from apps.common.validators import detect_target_type
from apps.common.pagination import BasePagination
from apps.asset.models import Subdomain

logger = logging.getLogger(__name__)


class OrganizationViewSet(viewsets.ModelViewSet):
    """组织管理 - 增删改查"""
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    pagination_class = BasePagination
    
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
    
    def destroy(self, request, *args, **kwargs):
        """
        异步删除单个组织（统一使用批量删除逻辑）
        
        DELETE /api/organizations/{id}/
        
        功能:
        - 立即返回 202 Accepted 状态，不等待删除完成
        - 在后台线程中执行删除操作
        - 发送通知告知删除进度
        
        返回:
        - 202 Accepted: 删除请求已接受，正在后台处理
        - 404 Not Found: 组织不存在
        
        注意:
        - 删除组织不会删除关联的目标
        - 只会清除组织与目标的关联关系
        - 通过通知中心查看删除进度和结果
        """
        try:
            # 获取组织对象（验证是否存在）
            organization = self.get_object()
            organization_id = organization.id
            organization_name = organization.name
            
            # 使用批量删除逻辑（传入单个ID）
            async_bulk_delete_organizations([organization_id], [organization_name])
            
            # 立即返回 202 Accepted
            return Response(
                {
                    'message': '组织删除请求已接受，正在后台处理',
                    'organizationId': organization_id,
                    'organizationName': organization_name,
                    'detail': '删除进度将通过通知中心告知'
                },
                status=status.HTTP_202_ACCEPTED
            )
        
        except Organization.DoesNotExist:
            return Response(
                {'error': '组织不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        批量异步删除组织
        
        POST/DELETE /api/organizations/bulk-delete/
        
        请求格式:
        {
            "ids": [1, 2, 3]
        }
        
        功能:
        - 立即返回 202 Accepted 状态，不等待删除完成
        - 在后台线程中批量执行删除操作
        - 发送通知告知删除进度和结果
        
        返回:
        - 202 Accepted: 删除请求已接受，正在后台处理
        - 400 Bad Request: 参数错误
        
        注意:
        - 删除组织不会删除关联的目标
        - 只会清除组织与目标的关联关系
        - 通过通知中心查看删除进度和结果
        """
        ids = request.data.get('ids', [])
        
        # 参数验证
        if not ids:
            return Response(
                {'error': '缺少必填参数: ids'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(ids, list):
            return Response(
                {'error': 'ids 必须是数组'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not all(isinstance(i, int) for i in ids):
            return Response(
                {'error': 'ids 数组中的所有元素必须是整数'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 获取组织名称（用于通知显示）- 通过 Service 层
        try:
            organization_service = OrganizationService()
            existing_ids, organization_names = organization_service.get_organizations_info(ids)
            
            if not existing_ids:
                return Response(
                    {'error': '未找到要删除的组织'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # 启动异步批量删除任务
            async_bulk_delete_organizations(existing_ids, organization_names)
            
            return Response(
                {
                    'message': f'已接受删除 {len(existing_ids)} 个组织的请求，正在后台处理',
                    'acceptedCount': len(existing_ids),
                    'requestedCount': len(ids),
                    'detail': '删除进度将通过通知中心告知'
                },
                status=status.HTTP_202_ACCEPTED
            )
        
        except Exception as e:
            logger.exception("批量删除组织时发生错误")
            return Response(
                {'error': '服务器错误，请稍后重试'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
    serializer_class = TargetSerializer
    pagination_class = BasePagination
    
    def get_queryset(self):
        """优化查询集，预加载关联对象
        
        查询优化策略：
        - select_related: 预加载一对一/多对一关系
        - prefetch_related: 预加载多对多关系（organizations）
        
        性能优化：
        - 移除 annotate Count 聚合（在大数据量时很慢）
        - 让 serializer 直接用 .count() 查询（单条记录时更快）
        - 原因：多个 Count(distinct=True) 在大数据量时很慢（特别是目录数据）
        """
        # 列表和详情都使用相同的查询集（详情页的统计交给 serializer 用 .count()）
        return Target.objects.prefetch_related('organizations').all()
    
    def get_serializer_class(self):
        """根据不同的 action 返回不同的序列化器
        
        - retrieve action: 使用 TargetDetailSerializer（包含 summary 统计数据）
        - 其他 action: 使用标准的 TargetSerializer
        """
        if self.action == 'retrieve':
            return TargetDetailSerializer
        return TargetSerializer
    
    def destroy(self, request, *args, **kwargs):
        """
        异步删除单个目标（统一使用批量删除逻辑）
        
        DELETE /api/targets/{id}/
        
        功能:
        - 立即返回 202 Accepted 状态，不等待删除完成
        - 在后台线程中执行删除操作
        - 适用于关联数据量大的场景（如40万条记录）
        - 发送通知告知删除进度
        
        返回:
        - 202 Accepted: 删除请求已接受，正在后台处理
        - 404 Not Found: 目标不存在
        
        注意:
        - 删除是级联的，会自动删除所有关联数据（子域名、IP、端点、漏洞等）
        - 删除过程可能需要几分钟，取决于关联数据量
        - 客户端收到响应后，目标可能还在删除中
        - 通过通知中心查看删除进度和结果
        """
        try:
            # 获取目标对象（验证是否存在）
            target = self.get_object()
            target_id = target.id
            target_name = target.name
            
            # 使用批量删除逻辑（传入单个ID）
            async_bulk_delete_targets([target_id], [target_name])
            
            # 立即返回 202 Accepted
            return Response(
                {
                    'message': '目标删除请求已接受，正在后台处理',
                    'targetId': target_id,
                    'targetName': target_name,
                    'detail': '删除进度将通过通知中心告知'
                },
                status=status.HTTP_202_ACCEPTED
            )
        
        except Target.DoesNotExist:
            return Response(
                {'error': '目标不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        批量异步删除目标
        
        POST/DELETE /api/targets/bulk-delete/
        
        请求格式:
        {
            "ids": [1, 2, 3]
        }
        
        功能:
        - 立即返回 202 Accepted 状态，不等待删除完成
        - 在后台线程中批量执行删除操作
        - 发送通知告知删除进度和结果
        
        返回:
        - 202 Accepted: 删除请求已接受，正在后台处理
        - 400 Bad Request: 参数错误
        
        注意:
        - 使用级联删除，会同时删除关联的子域名、IP、端点等数据
        - 删除过程可能需要几分钟，取决于关联数据量
        - 通过通知中心查看删除进度和结果
        """
        ids = request.data.get('ids', [])
        
        # 参数验证
        if not ids:
            return Response(
                {'error': '缺少必填参数: ids'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(ids, list):
            return Response(
                {'error': 'ids 必须是数组'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not all(isinstance(i, int) for i in ids):
            return Response(
                {'error': 'ids 数组中的所有元素必须是整数'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 获取目标名称（用于通知显示）- 通过 Service 层
        try:
            target_service = TargetService()
            existing_ids, target_names = target_service.get_targets_info(ids)
            
            if not existing_ids:
                return Response(
                    {'error': '未找到要删除的目标'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # 启动异步批量删除任务
            async_bulk_delete_targets(existing_ids, target_names)
            
            return Response(
                {
                    'message': f'已接受删除 {len(existing_ids)} 个目标的请求，正在后台处理',
                    'acceptedCount': len(existing_ids),
                    'requestedCount': len(ids),
                    'detail': '删除进度将通过通知中心告知'
                },
                status=status.HTTP_202_ACCEPTED
            )
        
        except Exception as e:
            logger.exception("批量删除目标时发生错误")
            return Response(
                {'error': '服务器错误，请稍后重试'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
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
                
                if target_type == Target.TargetType.DOMAIN:
                    Subdomain.objects.get_or_create(
                        name=normalized_name,
                        target=target,
                    )
                
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
    
    @action(detail=True, methods=['get'])
    def subdomains(self, request, pk=None):
        """
        获取目标关联的所有子域名（支持分页）
        
        URL: GET /api/targets/{id}/subdomains/?page=1&pageSize=10
        
        功能:
        - 返回指定目标下的所有子域名
        - 包含子域名的详细信息（名称、CNAME、CDN 信息等）
        - 支持分页查询
        
        返回:
        - results: 子域名列表
        - total: 总记录数
        - page: 当前页码
        - page_size: 每页大小
        - total_pages: 总页数
        """
        from apps.asset.serializers import SubdomainListSerializer
        from apps.asset.models import Subdomain
        from django.core.exceptions import ObjectDoesNotExist
        from django.db import DatabaseError, OperationalError
        
        try:
            # 获取目标对象
            target = self.get_object()
            
            # 获取该目标的所有子域名（按创建时间倒序）
            queryset = Subdomain.objects.filter(target=target).prefetch_related('ports', 'ip_addresses').order_by('-created_at')
            
            # 使用分页器
            paginator = self.paginator
            page = paginator.paginate_queryset(queryset, request, view=self)
            
            if page is not None:
                serializer = SubdomainListSerializer(page, many=True)
                return paginator.get_paginated_response(serializer.data)
            
            # 如果没有分页参数，返回错误
            return Response(
                {'error': '必须提供分页参数 page 和 pageSize'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        except ObjectDoesNotExist:
            return Response(
                {'error': f'目标 ID {pk} 不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        except (DatabaseError, OperationalError):
            return Response(
                {'error': '数据库错误，请稍后重试'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    @action(detail=True, methods=['get'], url_path='ip-addresses')
    def ip_addresses(self, request, pk=None):
        """
        获取目标关联的所有 IP 地址（支持分页）

        URL: GET /api/targets/{id}/ip-addresses/?page=1&pageSize=10
        """
        from apps.asset.serializers import IPAddressListSerializer
        from django.core.exceptions import ObjectDoesNotExist
        from django.db import DatabaseError, OperationalError

        try:
            target = self.get_object()
            queryset = target.ip_addresses.select_related('subdomain').prefetch_related('ports').order_by('-created_at')

            paginator = self.paginator
            page = paginator.paginate_queryset(queryset, request, view=self)

            if page is not None:
                serializer = IPAddressListSerializer(page, many=True)
                return paginator.get_paginated_response(serializer.data)

            return Response(
                {'error': '必须提供分页参数 page 和 pageSize'},
                status=status.HTTP_400_BAD_REQUEST
            )

        except ObjectDoesNotExist:
            return Response(
                {'error': f'目标 ID {pk} 不存在'},
                status=status.HTTP_404_NOT_FOUND
            )

        except (DatabaseError, OperationalError):
            return Response(
                {'error': '数据库错误，请稍后重试'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    @action(detail=True, methods=['get'])
    def websites(self, request, pk=None):
        """
        获取目标关联的所有站点（支持分页）

        URL: GET /api/targets/{id}/websites/?page=1&pageSize=10

        功能:
        - 返回指定目标下的所有站点信息
        - 包含站点的详细信息（URL、标题、技术栈、状态码等）
        - 支持分页查询

        返回:
        - results: 站点列表
        - total: 总记录数
        - page: 当前页码
        - page_size: 每页大小
        - total_pages: 总页数
        """
        from apps.asset.serializers import WebSiteSerializer
        from apps.asset.models import WebSite
        from django.core.exceptions import ObjectDoesNotExist
        from django.db import DatabaseError, OperationalError

        try:
            # 获取目标对象
            target = self.get_object()

            # 获取该目标的所有站点（按创建时间倒序）
            queryset = WebSite.objects.filter(target=target).select_related('subdomain').order_by('-created_at')

            # 使用分页器
            paginator = self.paginator
            page = paginator.paginate_queryset(queryset, request, view=self)

            if page is not None:
                serializer = WebSiteSerializer(page, many=True)
                return paginator.get_paginated_response(serializer.data)

            # 如果没有分页参数，返回错误
            return Response(
                {'error': '必须提供分页参数 page 和 pageSize'},
                status=status.HTTP_400_BAD_REQUEST
            )

        except ObjectDoesNotExist:
            return Response(
                {'error': f'目标 ID {pk} 不存在'},
                status=status.HTTP_404_NOT_FOUND
            )

        except (DatabaseError, OperationalError):
            return Response(
                {'error': '数据库错误，请稍后重试'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    @action(detail=True, methods=['get'])
    def directories(self, request, pk=None):
        """
        获取目标关联的所有目录（支持分页）

        URL: GET /api/targets/{id}/directories/?page=1&pageSize=10

        功能:
        - 返回指定目标下的所有目录信息
        - 包含目录的详细信息（URL、状态码、大小、内容类型等）
        - 支持分页查询

        返回:
        - results: 目录列表
        - total: 总记录数
        - page: 当前页码
        - page_size: 每页大小
        - total_pages: 总页数
        """
        from apps.asset.serializers import DirectorySerializer
        from apps.asset.models import Directory
        from django.core.exceptions import ObjectDoesNotExist
        from django.db import DatabaseError, OperationalError

        try:
            # 获取目标对象
            target = self.get_object()

            # 获取该目标的所有目录（按创建时间倒序）
            queryset = Directory.objects.filter(target=target).select_related('website').order_by('-created_at')

            # 使用分页器
            paginator = self.paginator
            page = paginator.paginate_queryset(queryset, request, view=self)

            if page is not None:
                serializer = DirectorySerializer(page, many=True)
                return paginator.get_paginated_response(serializer.data)

            # 如果没有分页参数，返回错误
            return Response(
                {'error': '必须提供分页参数 page 和 pageSize'},
                status=status.HTTP_400_BAD_REQUEST
            )

        except ObjectDoesNotExist:
            return Response(
                {'error': f'目标 ID {pk} 不存在'},
                status=status.HTTP_404_NOT_FOUND
            )

        except (DatabaseError, OperationalError):
            return Response(
                {'error': '数据库错误，请稍后重试'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
