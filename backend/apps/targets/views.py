import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotFound, APIException
from django.db import transaction
from django.db.models import Count
from .models import Organization, Target
from .serializers import OrganizationSerializer, TargetSerializer, TargetDetailSerializer, BatchCreateTargetSerializer
from .services.target_service import TargetService
from .services.organization_service import OrganizationService
from apps.common.normalizer import normalize_target
from apps.common.validators import detect_target_type
from apps.common.pagination import BasePagination
from apps.asset.models import Subdomain

logger = logging.getLogger(__name__)


class OrganizationViewSet(viewsets.ModelViewSet):
    """组织管理 - 增删改查"""
    serializer_class = OrganizationSerializer
    pagination_class = BasePagination
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.org_service = OrganizationService()
    
    def get_queryset(self):
        """优化查询,预计算目标数量，避免 N+1 查询"""
        return self.org_service.get_all_with_stats()
    
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
        
        # 如果没有分页参数，抛出异常
        raise ValidationError('必须提供分页参数 page 和 pageSize')
    
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
            raise ValidationError('目标ID列表不能为空')
        
        if not isinstance(target_ids, list):
            raise ValidationError('target_ids 必须是数组')
        
        # 使用事务保护
        with transaction.atomic():
            # 验证目标是否存在且属于该组织（只查询 ID，避免加载完整对象）
            existing_target_ids = list(
                organization.targets.filter(id__in=target_ids).values_list('id', flat=True)
            )
            existing_count = len(existing_target_ids)
            
            if existing_count == 0:
                raise ValidationError('未找到要解除关联的目标')
            
            # 批量解除关联（直接使用 ID，避免查询对象）
            organization.targets.remove(*existing_target_ids)
        
        return Response({
            'unlinked_count': existing_count,
            'message': f'成功解除 {existing_count} 个目标的关联'
        })
    
    def destroy(self, request, *args, **kwargs):
        """
        删除单个组织（复用批量删除逻辑）
        
        DELETE /api/organizations/{id}/
        
        功能:
        - 复用 bulk_delete 的两阶段删除逻辑
        - 立即返回 200 OK，软删除完成，硬删除在后台执行
        
        返回:
        - 200 OK: 软删除完成，硬删除已在后台启动
        - 404 Not Found: 组织不存在
        
        注意:
        - 两阶段删除：软删除（立即）+ 硬删除（后台 Prefect）
        - 硬删除会清理 organization_targets 中间表
        - 不会删除关联的 Target（多对多关系）
        """
        try:
            organization = self.get_object()
            
            # 直接调用 Service 层的业务方法（软删除 + 提交 Prefect Flow）
            result = self.org_service.delete_organizations_two_phase([organization.id])
            
            return Response({
                'message': f'已删除组织: {organization.name}',
                'organizationId': organization.id,
                'organizationName': organization.name,
                'deletedCount': result['soft_deleted_count'],
                'deletedOrganizations': result['organization_names'],
                'detail': {
                    'phase1': '软删除完成，用户已看不到数据',
                    'phase2': '硬删除已提交到 Prefect，将在后台执行'
                }
            }, status=200)
        
        except Organization.DoesNotExist:
            raise NotFound('组织不存在')
        except ValueError as e:
            raise NotFound(str(e))
        except Exception as e:
            logger.exception("删除组织时发生错误")
            raise APIException('服务器错误，请稍后重试')
    
    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        批量删除组织（两阶段删除）
        
        POST/DELETE /api/organizations/bulk-delete/
        
        请求格式:
        {
            "ids": [1, 2, 3]
        }
        
        功能:
        - 阶段 1：立即软删除（用户立即看不到数据）
        - 阶段 2：Prefect 硬删除（真正删除数据和中间表）
        - 立即返回 200 OK，硬删除提交到 Prefect
        
        返回:
        - 200 OK: 软删除完成，硬删除已提交到 Prefect
        - 400 Bad Request: 参数错误
        - 404 Not Found: 未找到要删除的组织
        
        注意:
        - 软删除：用户立即看不到
        - 硬删除：清理数据库和 organization_targets 中间表
        - 不会删除关联的 Target（多对多关系）
        - 使用 Prefect Flow 管理删除流程，可在 Prefect UI 查看进度
        """
        ids = request.data.get('ids', [])
        
        # 参数验证
        if not ids:
            raise ValidationError('缺少必填参数: ids')
        if not isinstance(ids, list):
            raise ValidationError('ids 必须是数组')
        if not all(isinstance(i, int) for i in ids):
            raise ValidationError('ids 数组中的所有元素必须是整数')
        
        try:
            # 调用 Service 层的业务方法（软删除 + 提交 Prefect Flow）
            result = self.org_service.delete_organizations_two_phase(ids)
            
            return Response({
                'message': f"已删除 {result['soft_deleted_count']} 个组织",
                'deletedCount': result['soft_deleted_count'],
                'deletedOrganizations': result['organization_names'],
                'detail': {
                    'phase1': '软删除完成，用户已看不到数据',
                    'phase2': '硬删除已提交到 Prefect，将在后台执行'
                }
            }, status=200)
        
        except ValueError as e:
            raise NotFound(str(e))
        except Exception as e:
            logger.exception("删除组织时发生错误")
            raise APIException('服务器错误，请稍后重试')


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
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.target_service = TargetService()
    
    def get_queryset(self):
        """获取目标查询集
        
        注意：不在这里使用 .annotate() 预聚合统计数据
        
        原因：
        - 列表页（list action）：需要分页 + 高性能统计
        - 详情页（retrieve action）：只需要一条记录的统计
        
        统计策略：
        - 列表页：在 serializer 中用 .count() 单次查询（高性能）
        - 详情页：同样用 .count() 单次查询
        
        ⚠️ 为什么不用 .annotate():
        - 原因：多个 Count(distinct=True) 在大数据量时很慢（特别是目录数据）
        """
        # 列表和详情都使用相同的查询集（详情页的统计交给 serializer 用 .count()）
        return self.target_service.get_all()
    
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
        删除单个目标（复用批量删除逻辑）
        
        DELETE /api/targets/{id}/
        
        功能:
        - 复用 bulk_delete 的两阶段删除逻辑
        - 立即返回 200 OK，软删除完成，硬删除在后台执行
        
        返回:
        - 200 OK: 软删除完成，硬删除已在后台启动
        - 404 Not Found: 目标不存在
        
        注意:
        - 两阶段删除：软删除（立即）+ 硬删除（后台 Prefect）
        - 硬删除会使用分批删除策略处理大数据量
        """
        try:
            target = self.get_object()
            
            # 直接调用 Service 层的业务方法（软删除 + 提交 Prefect Flow）
            result = self.target_service.delete_targets_two_phase([target.id])
            
            return Response({
                'message': f'已删除目标: {target.name}',
                'targetId': target.id,
                'targetName': target.name,
                'deletedCount': result['soft_deleted_count'],
                'deletedTargets': result['target_names'],
                'detail': {
                    'phase1': '软删除完成，用户已看不到数据',
                    'phase2': '硬删除已提交到 Prefect，将在后台执行'
                }
            }, status=200)
        
        except Target.DoesNotExist:
            raise NotFound('目标不存在')
        except ValueError as e:
            raise NotFound(str(e))
        except Exception as e:
            logger.exception("删除目标时发生错误")
            raise APIException('服务器错误，请稍后重试')
    
    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        批量删除目标（两阶段删除策略）
        
        POST/DELETE /api/targets/bulk-delete/
        
        请求格式:
        {
            "ids": [1, 2, 3]
        }
        
        两阶段删除策略：
        1. 阶段 1（立即）：软删除目标，用户立即看不到数据
        2. 阶段 2（后台）：Prefect Flow 硬删除，真正清理数据
        
        功能:
        - 立即软删除：用户立即看不到数据（响应快）
        - Prefect 硬删除：后台执行，使用分批删除策略处理大数据量
        - 自动重试：Prefect Task 自动重试失败的删除操作
        
        返回:
        - 200 OK: 软删除成功，硬删除已提交到 Prefect
        - 400 Bad Request: 参数错误
        - 404 Not Found: 未找到目标
        
        注意:
        - 软删除：数据可恢复（is_deleted=True）
        - 硬删除：数据不可恢复（真正从数据库删除）
        - 使用 Prefect Flow 管理删除流程，可在 Prefect UI 查看进度
        """
        ids = request.data.get('ids', [])
        
        # 参数验证
        if not ids:
            raise ValidationError('缺少必填参数: ids')
        if not isinstance(ids, list):
            raise ValidationError('ids 必须是数组')
        if not all(isinstance(i, int) for i in ids):
            raise ValidationError('ids 数组中的所有元素必须是整数')
        
        try:
            # 调用 Service 层的业务方法（软删除 + 提交 Prefect Flow）
            result = self.target_service.delete_targets_two_phase(ids)
            
            return Response({
                'message': f"已删除 {result['soft_deleted_count']} 个目标",
                'deletedCount': result['soft_deleted_count'],
                'deletedTargets': result['target_names'],
                'detail': {
                    'phase1': '软删除完成，用户已看不到数据',
                    'phase2': '硬删除已提交到 Prefect，将在后台执行'
                }
            }, status=200)
        
        except ValueError as e:
            raise NotFound(str(e))
        except Exception as e:
            logger.exception("删除目标时发生错误")
            raise APIException('服务器错误，请稍后重试')
    
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
        
        限制：
        - 最多支持 1000 个目标的批量创建
        - type 会根据 name 自动检测（域名/IP/CIDR）
        
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
            org_service = OrganizationService()
            organization = org_service.get_organization(organization_id)
            if not organization:
                raise ValidationError(f'组织 ID {organization_id} 不存在')
        
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
                
                # 3. 写入：通过 Service 层创建或获取目标
                target, created = self.target_service.create_or_get_target(
                    name=normalized_name,
                    target_type=target_type
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
            raise ValidationError('必须提供分页参数 page 和 pageSize')
        
        except ObjectDoesNotExist:
            raise NotFound(f'目标 ID {pk} 不存在')
        
        except (DatabaseError, OperationalError):
            raise APIException('数据库错误，请稍后重试')

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

            raise ValidationError('必须提供分页参数 page 和 pageSize')

        except ObjectDoesNotExist:
            raise NotFound(f'目标 ID {pk} 不存在')

        except (DatabaseError, OperationalError):
            raise APIException('数据库错误，请稍后重试')

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
            raise ValidationError('必须提供分页参数 page 和 pageSize')

        except ObjectDoesNotExist:
            raise NotFound(f'目标 ID {pk} 不存在')

        except (DatabaseError, OperationalError):
            raise APIException('数据库错误，请稍后重试')

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
            raise ValidationError('必须提供分页参数 page 和 pageSize')

        except ObjectDoesNotExist:
            raise NotFound(f'目标 ID {pk} 不存在')

        except (DatabaseError, OperationalError):
            raise APIException('数据库错误，请稍后重试')
