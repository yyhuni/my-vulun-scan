from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db.utils import DatabaseError, IntegrityError, OperationalError
from celery.exceptions import CeleryError

from .models import Scan
from .serializers import ScanSerializer, ScanHistorySerializer
from .services.scan_service import ScanService
from apps.targets.models import Target, Organization
from apps.engine.models import ScanEngine
from apps.common.definitions import ScanTaskStatus


class ScanViewSet(viewsets.ModelViewSet):
    """扫描任务视图集"""
    serializer_class = ScanSerializer
    
    def get_queryset(self):
        """优化查询集，预加载关联对象
        
        使用 select_related 和 prefetch_related 优化查询性能：
        - select_related: 预加载 target 和 engine（一对一/多对一关系）
        - prefetch_related: 预加载 subdomains 和 endpoints（一对多关系）
        
        避免 N+1 查询问题，提升列表页面性能。
        """
        return Scan.objects.select_related(
            'target', 'engine'
        ).prefetch_related(
            'subdomains', 'endpoints'
        ).all()  # type: ignore  # pylint: disable=no-member
    
    def get_serializer_class(self):
        """根据不同的 action 返回不同的序列化器
        
        - list action: 使用 ScanHistorySerializer（包含 summary 和 progress）
        - 其他 action: 使用标准的 ScanSerializer
        """
        if self.action == 'list':
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
        
        # 参数验证
        if not engine_id:
            return Response(
                {'error': '缺少必填参数: engine_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not organization_id and not target_id:
            return Response(
                {'error': '必须提供 organization_id 或 target_id 其中之一'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if organization_id and target_id:
            return Response(
                {'error': 'organization_id 和 target_id 只能提供其中之一'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 获取扫描引擎
            engine = ScanEngine.objects.get(id=engine_id)  # type: ignore  # pylint: disable=no-member
            
            # 根据参数获取目标列表
            targets = []
            if organization_id:
                # 根据组织ID获取所有目标（优化：不需要 select_related，因为只使用 target 本身）
                organization = Organization.objects.get(id=organization_id)  # type: ignore  # pylint: disable=no-member
                targets = list(organization.targets.all())
                
                if not targets:
                    return Response(
                        {'error': f'组织 ID {organization_id} 下没有目标'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                # 根据目标ID获取单个目标
                target = Target.objects.get(id=target_id)  # type: ignore  # pylint: disable=no-member
                targets = [target]
            
            # 使用 Service 层批量创建扫描任务
            scan_service = ScanService()
            created_scans = scan_service.create_scans_for_targets(
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
            # 根据异常消息判断是哪个模型不存在
            error_msg = str(e)
            if 'Organization' in error_msg:
                return Response(
                    {'error': f'组织 ID {organization_id} 不存在'},
                    status=status.HTTP_404_NOT_FOUND
                )
            elif 'Target' in error_msg:
                return Response(
                    {'error': f'目标 ID {target_id} 不存在'},
                    status=status.HTTP_404_NOT_FOUND
                )
            elif 'ScanEngine' in error_msg:
                return Response(
                    {'error': f'扫描引擎 ID {engine_id} 不存在'},
                    status=status.HTTP_404_NOT_FOUND
                )
            else:
                return Response(
                    {'error': f'资源不存在: {error_msg}'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        except ValidationError as e:
            # 数据验证错误
            return Response(
                {'error': f'数据验证失败: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        except (DatabaseError, IntegrityError, OperationalError) as e:
            # 数据库错误
            return Response(
                {'error': '数据库错误，请稍后重试'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        except CeleryError as e:
            # Celery 任务提交失败
            return Response(
                {'error': f'任务提交失败: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
    
    @action(detail=False, methods=['post', 'delete'])
    def bulk_delete(self, request):
        """
        批量删除扫描记录
        
        请求参数:
        - ids: 扫描ID列表 (list[int], 必填)
        
        示例请求:
        POST /api/scans/bulk_delete/
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
            # 批量删除（级联删除关联数据）
            deleted_count, _ = Scan.objects.filter(id__in=ids).delete()  # type: ignore  # pylint: disable=no-member
            
            return Response(
                {
                    'message': f'已删除 {deleted_count} 个扫描记录',
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
        from django.db.models import Count
        
        try:
            # 基础统计
            total_scans = Scan.objects.count()  # type: ignore  # pylint: disable=no-member
            
            # 按状态统计
            running_scans = Scan.objects.filter(status='running').count()  # type: ignore  # pylint: disable=no-member
            successful_scans = Scan.objects.filter(status='successful').count()  # type: ignore  # pylint: disable=no-member
            failed_scans = Scan.objects.filter(status='failed').count()  # type: ignore  # pylint: disable=no-member
            aborted_scans = Scan.objects.filter(status='aborted').count()  # type: ignore  # pylint: disable=no-member
            initiated_scans = Scan.objects.filter(status='initiated').count()  # type: ignore  # pylint: disable=no-member
            
            # 统计总资产数（注意：这里统计的是关联记录数，不是去重后的）
            # 如果需要精确统计，需要在 Subdomain 和 Endpoint 模型上进行
            total_assets = Scan.objects.aggregate(  # type: ignore  # pylint: disable=no-member
                total_subdomains=Count('subdomains'),
                total_endpoints=Count('endpoints')
            )
            
            total_subdomains = total_assets['total_subdomains'] or 0
            total_endpoints = total_assets['total_endpoints'] or 0
            
            return Response({
                'total': total_scans,
                'running': running_scans,
                'successful': successful_scans,
                'failed': failed_scans,
                'aborted': aborted_scans,
                'initiated': initiated_scans,
                'totalSubdomains': total_subdomains,
                'totalEndpoints': total_endpoints,
                'totalAssets': total_subdomains + total_endpoints
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
        - 撤销所有关联的 Celery 任务
        - 更新扫描状态为 'aborted'
        
        状态限制:
        - 只能停止 'running' 或 'initiated' 状态的扫描
        - 已完成、失败或中止的扫描无法停止
        
        返回:
        - message: 成功消息
        - revokedTaskCount: 撤销的任务数量
        """
        try:
            # 使用 Service 层处理停止逻辑
            scan_service = ScanService()
            success, revoked_count = scan_service.stop_scan(scan_id=pk)
            
            if not success:
                # 检查是否是状态不允许的问题
                scan = Scan.objects.get(id=pk)  # type: ignore  # pylint: disable=no-member
                if scan.status not in [ScanTaskStatus.RUNNING, ScanTaskStatus.INITIATED]:
                    return Response(
                        {
                            'error': f'无法停止扫描：当前状态为 {ScanTaskStatus(scan.status).label}',
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
