from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db.utils import DatabaseError, IntegrityError, OperationalError

from .models import Scan
from .serializers import ScanSerializer, ScanHistorySerializer
from .services.scan_service import ScanService
from apps.common.definitions import ScanStatus
from apps.common.pagination import BasePagination
from apps.asset.serializers import SubdomainListSerializer, IPAddressListSerializer, WebSiteSerializer, DirectorySerializer


class ScanViewSet(viewsets.ModelViewSet):
    """扫描任务视图集"""
    serializer_class = ScanSerializer
    pagination_class = BasePagination
    
    def get_queryset(self):
        """优化查询集，预加载关联对象
        
        查询优化策略：
        - select_related: 预加载 target 和 engine（一对一/多对一关系，使用 JOIN）
        - annotate: 使用数据库聚合计算子域名、网站、端点和IP地址数量（避免 N+1 查询）
        - prefetch_related: 预加载 subdomains、websites、endpoints 和 ip_addresses（用于详情页面）
        - order_by: 按 ID 降序排列（最新创建的任务排在最前面）
        
        排序说明：
        - 使用 ID 降序而非 started_at，因为 started_at 在 INITIATED 状态时为 NULL
        - ID 是自增的，代表创建顺序，且永远不为 NULL
        - 确保最新创建的任务（包括未开始的）都排在最前面
        
        性能优势：
        - 单次查询完成所有统计计数
        - 避免 N+1 查询问题
        - 列表页面性能显著提升
        """
        from django.db.models import Count
        
        return Scan.objects.select_related(
            'target', 'engine'
        ).annotate(
            subdomains_count=Count('subdomains', distinct=True),  # 子域名数量
            websites_count=Count('websites', distinct=True),      # 网站数量
            endpoints_count=Count('endpoints', distinct=True),    # 端点数量
            ips_count=Count('ip_addresses', distinct=True)        # IP地址数量
        ).prefetch_related(
            'subdomains', 'websites', 'endpoints', 'ip_addresses'  # 用于详情页面
        ).order_by('-id').all()  # type: ignore  # pylint: disable=no-member
    
    def get_serializer_class(self):
        """根据不同的 action 返回不同的序列化器
        
        - list action: 使用 ScanHistorySerializer（包含 summary 和 progress）
        - retrieve action: 使用 ScanHistorySerializer（包含 summary 和 progress）
        - 其他 action: 使用标准的 ScanSerializer
        """
        if self.action in ['list', 'retrieve']:
            return ScanHistorySerializer
        return ScanSerializer
    
    @action(detail=False, methods=['post'])
    def initiate(self, request):
        """
        发起扫描任务
        
        请求参数:
        - organization_id: 组织ID (int, 可选)
        - target_id: 目标ID (int, 可选)
        - engine_id: 扫描引擎ID (int, 必填)
        
        注意: organization_id 和 target_id 二选一
        
        返回:
        - 扫描任务详情（单个或多个）
        """
        # 获取请求数据
        organization_id = request.data.get('organization_id')
        target_id = request.data.get('target_id')
        engine_id = request.data.get('engine_id')
        
        try:
            # 使用 Service 层准备扫描任务（查询和验证）
            scan_service = ScanService()
            targets, engine = scan_service.prepare_initiate_scan(
                organization_id=organization_id,
                target_id=target_id,
                engine_id=engine_id
            )
            
            # 使用 Service 层批量创建扫描任务
            created_scans = scan_service.create_scans(
                targets=targets,
                engine=engine
            )
            
            # 序列化返回结果
            scan_serializer = ScanSerializer(created_scans, many=True)
            
            return Response(
                {
                    'message': f'已成功发起 {len(created_scans)} 个扫描任务',
                    'count': len(created_scans),
                    'scans': scan_serializer.data
                },
                status=status.HTTP_201_CREATED
            )
            
        except ObjectDoesNotExist as e:
            # 资源不存在错误（由 service 层抛出）
            error_msg = str(e)
            return Response(
                {'error': error_msg},
                status=status.HTTP_404_NOT_FOUND
            )
        
        except ValidationError as e:
            # 参数验证错误（由 service 层抛出）
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        except (DatabaseError, IntegrityError, OperationalError):
            # 数据库错误
            return Response(
                {'error': '数据库错误，请稍后重试'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
    
    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        批量删除扫描记录
        
        请求参数:
        - ids: 扫描ID列表 (list[int], 必填)
        
        示例请求:
        POST /api/scans/bulk-delete/
        {
            "ids": [1, 2, 3]
        }
        
        返回:
        - message: 成功消息
        - deletedCount: 实际删除的记录数
        
        注意:
        - 使用级联删除，会同时删除关联的子域名、端点等数据
        - 只删除存在的记录，不存在的ID会被忽略
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
        
        try:
            # 使用 Service 层批量删除（级联删除关联数据）
            scan_service = ScanService()
            deleted_count, message = scan_service.bulk_delete(ids)
            
            return Response(
                {
                    'message': message,
                    'deletedCount': deleted_count
                },
                status=status.HTTP_200_OK
            )
        
        except (DatabaseError, IntegrityError, OperationalError):
            # 数据库错误
            return Response(
                {'error': '数据库错误，请稍后重试'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        获取扫描统计数据
        
        返回扫描任务的汇总统计信息，用于仪表板显示。
        使用数据库聚合查询，性能优异。
        
        返回:
        - total: 总扫描次数
        - running: 运行中的扫描数量
        - successful: 成功完成的扫描数量
        - failed: 失败的扫描数量
        - aborted: 中止的扫描数量
        - initiated: 初始化的扫描数量
        - totalSubdomains: 总共发现的子域名数量
        - totalEndpoints: 总共发现的端点数量
        - totalAssets: 总资产数（子域名 + 端点）
        """
        try:
            # 使用 Service 层获取统计数据
            scan_service = ScanService()
            stats = scan_service.get_statistics()
            
            return Response({
                'total': stats['total'],
                'running': stats['running'],
                'successful': stats['successful'],
                'failed': stats['failed'],
                'aborted': stats['aborted'],
                'initiated': stats['initiated'],
                'totalSubdomains': stats['total_subdomains'],
                'totalEndpoints': stats['total_endpoints'],
                'totalAssets': stats['total_assets']
            })
        
        except (DatabaseError, OperationalError):
            return Response(
                {'error': '数据库错误，请稍后重试'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
    
    @action(detail=True, methods=['post'])
    def stop(self, request, pk=None):  # pylint: disable=unused-argument
        """
        停止扫描任务
        
        URL: POST /api/scans/{id}/stop/
        
        功能:
        - 终止正在运行或初始化的扫描任务
        - 通过 Prefect API 取消 Flow Run
        - 更新扫描状态为 CANCELLED
        
        状态限制:
        - 只能停止 RUNNING 或 INITIATED 状态的扫描
        - 已完成、失败或取消的扫描无法停止
        
        返回:
        - message: 成功消息
        - revokedTaskCount: 取消的 Flow Run 数量
        """
        try:
            # 使用 Service 层处理停止逻辑
            scan_service = ScanService()
            success, revoked_count = scan_service.stop_scan(scan_id=pk)
            
            if not success:
                # 检查是否是状态不允许的问题
                scan = scan_service.get_scan(scan_id=pk, prefetch_relations=False)
                if scan and scan.status not in [ScanStatus.RUNNING, ScanStatus.INITIATED]:
                    return Response(
                        {
                            'error': f'无法停止扫描：当前状态为 {ScanStatus(scan.status).label}',
                            'detail': '只能停止运行中或初始化状态的扫描'
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # 其他失败原因
                return Response(
                    {'error': '停止扫描失败'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response(
                {
                    'message': f'扫描已停止，已撤销 {revoked_count} 个任务',
                    'revokedTaskCount': revoked_count
                },
                status=status.HTTP_200_OK
            )
        
        except ObjectDoesNotExist:
            return Response(
                {'error': f'扫描 ID {pk} 不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        except (DatabaseError, IntegrityError, OperationalError):
            return Response(
                {'error': '数据库错误，请稍后重试'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
    
    @action(detail=True, methods=['get'])
    def subdomains(self, request, pk=None):  # pylint: disable=unused-argument
        """
        获取扫描关联的所有子域名（支持分页）
        
        URL: GET /api/scans/{id}/subdomains/?page=1&pageSize=10
        
        功能:
        - 返回指定扫描任务发现的所有子域名
        - 包含子域名的详细信息（名称、CNAME、CDN 信息等）
        - 支持分页查询
        
        返回:
        - results: 子域名列表
        - total: 总记录数
        - page: 当前页码
        - page_size: 每页大小
        - total_pages: 总页数
        """
        try:
            # 使用 Service 层获取扫描对象
            scan_service = ScanService()
            scan = scan_service.get_scan(scan_id=pk, prefetch_relations=False)
            
            if not scan:
                return Response(
                    {'error': f'扫描 ID {pk} 不存在'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # 获取该扫描的所有子域名（按创建时间倒序）
            queryset = scan.subdomains.prefetch_related('ports', 'ip_addresses').order_by('-created_at')
            
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
                {'error': f'扫描 ID {pk} 不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        except (DatabaseError, OperationalError):
            return Response(
                {'error': '数据库错误，请稍后重试'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    @action(detail=True, methods=['get'], url_path='ip-addresses')
    def ip_addresses(self, request, pk=None):  # pylint: disable=unused-argument
        """
        获取扫描关联的所有 IP 地址（支持分页）
        
        URL: GET /api/scans/{id}/ip-addresses/?page=1&pageSize=10
        
        功能:
        - 返回指定扫描任务发现的所有 IP 地址
        - 包含 IP 地址的详细信息（地址、关联子域名、端口等）
        - 支持分页查询
        
        返回:
        - results: IP 地址列表
        - total: 总记录数
        - page: 当前页码
        - page_size: 每页大小
        - total_pages: 总页数
        """
        try:
            scan_service = ScanService()
            scan = scan_service.get_scan(scan_id=pk, prefetch_relations=False)

            if not scan:
                return Response(
                    {'error': f'扫描 ID {pk} 不存在'},
                    status=status.HTTP_404_NOT_FOUND
                )

            queryset = scan.ip_addresses.select_related('subdomain').prefetch_related('ports').order_by('-created_at')

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
                {'error': f'扫描 ID {pk} 不存在'},
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
        获取扫描关联的所有站点（支持分页）

        URL: GET /api/scans/{id}/websites/?page=1&pageSize=10

        功能:
        - 返回指定扫描任务发现的所有站点信息
        - 包含站点的详细信息（URL、标题、技术栈、状态码等）
        - 支持分页查询

        返回:
        - results: 站点列表
        - total: 总记录数
        - page: 当前页码
        - page_size: 每页大小
        - total_pages: 总页数
        """
        try:
            scan_service = ScanService()
            scan = scan_service.get_scan(scan_id=pk, prefetch_relations=False)

            if not scan:
                return Response(
                    {'error': f'扫描 ID {pk} 不存在'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # 获取该扫描的所有站点（按创建时间倒序）
            queryset = scan.websites.select_related('subdomain').order_by('-created_at')

            paginator = self.paginator
            page = paginator.paginate_queryset(queryset, request, view=self)

            if page is not None:
                serializer = WebSiteSerializer(page, many=True)
                return paginator.get_paginated_response(serializer.data)

            return Response(
                {'error': '必须提供分页参数 page 和 pageSize'},
                status=status.HTTP_400_BAD_REQUEST
            )

        except ObjectDoesNotExist:
            return Response(
                {'error': f'扫描 ID {pk} 不存在'},
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
        获取扫描关联的所有目录（支持分页）

        URL: GET /api/scans/{id}/directories/?page=1&pageSize=10

        功能:
        - 返回指定扫描任务发现的所有目录信息
        - 包含目录的详细信息（URL、状态码、大小、内容类型等）
        - 支持分页查询

        返回:
        - results: 目录列表
        - total: 总记录数
        - page: 当前页码
        - page_size: 每页大小
        - total_pages: 总页数
        """
        try:
            scan_service = ScanService()
            scan = scan_service.get_scan(scan_id=pk, prefetch_relations=False)

            if not scan:
                return Response(
                    {'error': f'扫描 ID {pk} 不存在'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # 获取该扫描的所有目录（按创建时间倒序）
            queryset = scan.directories.select_related('website').order_by('-created_at')

            paginator = self.paginator
            page = paginator.paginate_queryset(queryset, request, view=self)

            if page is not None:
                serializer = DirectorySerializer(page, many=True)
                return paginator.get_paginated_response(serializer.data)

            return Response(
                {'error': '必须提供分页参数 page 和 pageSize'},
                status=status.HTTP_400_BAD_REQUEST
            )

        except ObjectDoesNotExist:
            return Response(
                {'error': f'扫描 ID {pk} 不存在'},
                status=status.HTTP_404_NOT_FOUND
            )

        except (DatabaseError, OperationalError):
            return Response(
                {'error': '数据库错误，请稍后重试'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
