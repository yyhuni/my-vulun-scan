from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, APIException
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db.utils import DatabaseError, IntegrityError, OperationalError
import logging

from apps.common.response_helpers import success_response, error_response
from apps.common.error_codes import ErrorCodes
from apps.scan.utils.config_merger import ConfigConflictError

logger = logging.getLogger(__name__)

from ..models import Scan, ScheduledScan
from ..serializers import (
    ScanSerializer, ScanHistorySerializer, QuickScanSerializer,
    InitiateScanSerializer, ScheduledScanSerializer, CreateScheduledScanSerializer,
    UpdateScheduledScanSerializer, ToggleScheduledScanSerializer
)
from ..services.scan_service import ScanService
from ..services.scheduled_scan_service import ScheduledScanService
from ..repositories import ScheduledScanDTO
from apps.targets.services.target_service import TargetService
from apps.targets.services.organization_service import OrganizationService
from apps.engine.services.engine_service import EngineService
from apps.common.definitions import ScanStatus
from apps.common.pagination import BasePagination


class ScanViewSet(viewsets.ModelViewSet):
    """扫描任务视图集"""
    serializer_class = ScanSerializer
    pagination_class = BasePagination
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['target']  # 支持 ?target=123 过滤
    search_fields = ['target__name']  # 按目标名称搜索
    
    def get_queryset(self):
        """优化查询集，提升API性能
        
        查询优化策略：
        - select_related: 预加载 target 和 engine（一对一/多对一关系，使用 JOIN）
        - 移除 prefetch_related: 避免加载大量资产数据到内存
        - order_by: 按创建时间降序排列（最新创建的任务排在最前面）
        
        性能优化原理：
        - 列表页：使用缓存统计字段（cached_*_count），避免实时 COUNT 查询
        - 序列化器：严格验证缓存字段，确保数据一致性
        - 分页场景：每页只显示10条记录，查询高效
        - 避免大数据加载：不再预加载所有关联的资产数据
        """
        # 只保留必要的 select_related，移除所有 prefetch_related
        scan_service = ScanService()
        queryset = scan_service.get_all_scans(prefetch_relations=True)
        
        return queryset
    
    def get_serializer_class(self):
        """根据不同的 action 返回不同的序列化器
        
        - list action: 使用 ScanHistorySerializer（包含 summary 和 progress）
        - retrieve action: 使用 ScanHistorySerializer（包含 summary 和 progress）
        - 其他 action: 使用标准的 ScanSerializer
        """
        if self.action in ['list', 'retrieve']:
            return ScanHistorySerializer
        return ScanSerializer

    def destroy(self, request, *args, **kwargs):
        """
        删除单个扫描任务（两阶段删除）
        
        1. 软删除：立即对用户不可见
        2. 硬删除：后台异步执行
        """
        try:
            scan = self.get_object()
            scan_service = ScanService()
            result = scan_service.delete_scans_two_phase([scan.id])
            
            return success_response(
                data={
                    'scanId': scan.id,
                    'deletedCount': result['soft_deleted_count'],
                    'deletedScans': result['scan_names']
                }
            )
            
        except Scan.DoesNotExist:
            return error_response(
                code=ErrorCodes.NOT_FOUND,
                status_code=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return error_response(
                code=ErrorCodes.NOT_FOUND,
                message=str(e),
                status_code=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.exception("删除扫描任务时发生错误")
            return error_response(
                code=ErrorCodes.SERVER_ERROR,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def quick(self, request):
        """
        快速扫描接口
        
        功能：
        1. 接收目标列表和 YAML 配置
        2. 自动解析输入（支持 URL、域名、IP、CIDR）
        3. 批量创建 Target、Website、Endpoint 资产
        4. 立即发起批量扫描
        
        请求参数：
        {
            "targets": [{"name": "example.com"}, {"name": "https://example.com/api"}],
            "configuration": "subdomain_discovery:\n  enabled: true\n  ...",
            "engine_ids": [1, 2],  // 可选，用于记录
            "engine_names": ["引擎A", "引擎B"]  // 可选，用于记录
        }
        
        支持的输入格式：
        - 域名: example.com
        - IP: 192.168.1.1
        - CIDR: 10.0.0.0/8
        - URL: https://example.com/api/v1
        """
        from ..services.quick_scan_service import QuickScanService
        
        serializer = QuickScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        targets_data = serializer.validated_data['targets']
        configuration = serializer.validated_data['configuration']
        engine_ids = serializer.validated_data.get('engine_ids', [])
        engine_names = serializer.validated_data.get('engine_names', [])
        
        try:
            # 提取输入字符串列表
            inputs = [t['name'] for t in targets_data]
            
            # 1. 使用 QuickScanService 解析输入并创建资产
            quick_scan_service = QuickScanService()
            result = quick_scan_service.process_quick_scan(inputs, engine_ids[0] if engine_ids else None)
            
            targets = result['targets']
            
            if not targets:
                return error_response(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='No valid targets for scanning',
                    details=result.get('errors', []),
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            
            # 2. 直接使用前端传递的配置创建扫描
            scan_service = ScanService()
            created_scans = scan_service.create_scans(
                targets=targets,
                engine_ids=engine_ids,
                engine_names=engine_names,
                yaml_configuration=configuration
            )
            
            # 检查是否成功创建扫描任务
            if not created_scans:
                return error_response(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='No scan tasks were created. All targets may already have active scans.',
                    details={
                        'targetStats': result['target_stats'],
                        'assetStats': result['asset_stats'],
                        'errors': result.get('errors', [])
                    },
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
                )
            
            # 序列化返回结果
            scan_serializer = ScanSerializer(created_scans, many=True)
            
            return success_response(
                data={
                    'count': len(created_scans),
                    'targetStats': result['target_stats'],
                    'assetStats': result['asset_stats'],
                    'errors': result.get('errors', []),
                    'scans': scan_serializer.data
                },
                status_code=status.HTTP_201_CREATED
            )
            
        except ValidationError as e:
            return error_response(
                code=ErrorCodes.VALIDATION_ERROR,
                message=str(e),
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.exception("快速扫描启动失败")
            return error_response(
                code=ErrorCodes.SERVER_ERROR,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def initiate(self, request):
        """
        发起扫描任务
        
        请求参数:
        - organization_id: 组织ID (int, 可选)
        - target_id: 目标ID (int, 可选)
        - configuration: YAML 配置字符串 (str, 必填)
        - engine_ids: 扫描引擎ID列表 (list[int], 必填)
        - engine_names: 引擎名称列表 (list[str], 必填)
        
        注意: organization_id 和 target_id 二选一
        
        返回:
        - 扫描任务详情（单个或多个）
        """
        # 使用 serializer 验证请求数据
        serializer = InitiateScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 获取验证后的数据
        organization_id = serializer.validated_data.get('organization_id')
        target_id = serializer.validated_data.get('target_id')
        configuration = serializer.validated_data['configuration']
        engine_ids = serializer.validated_data['engine_ids']
        engine_names = serializer.validated_data['engine_names']
        
        try:
            # 获取目标列表
            scan_service = ScanService()
            
            if organization_id:
                from apps.targets.repositories import DjangoOrganizationRepository
                org_repo = DjangoOrganizationRepository()
                organization = org_repo.get_by_id(organization_id)
                if not organization:
                    raise ObjectDoesNotExist(f'Organization ID {organization_id} 不存在')
                targets = org_repo.get_targets(organization_id)
                if not targets:
                    raise ValidationError(f'组织 ID {organization_id} 下没有目标')
            else:
                from apps.targets.repositories import DjangoTargetRepository
                target_repo = DjangoTargetRepository()
                target = target_repo.get_by_id(target_id)
                if not target:
                    raise ObjectDoesNotExist(f'Target ID {target_id} 不存在')
                targets = [target]
            
            # 直接使用前端传递的配置创建扫描
            created_scans = scan_service.create_scans(
                targets=targets,
                engine_ids=engine_ids,
                engine_names=engine_names,
                yaml_configuration=configuration
            )
            
            # 检查是否成功创建扫描任务
            if not created_scans:
                return error_response(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='No scan tasks were created. All targets may already have active scans.',
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
                )
            
            # 序列化返回结果
            scan_serializer = ScanSerializer(created_scans, many=True)
            
            return success_response(
                data={
                    'count': len(created_scans),
                    'scans': scan_serializer.data
                },
                status_code=status.HTTP_201_CREATED
            )
            
        except ObjectDoesNotExist as e:
            # 资源不存在错误（由 service 层抛出）
            return error_response(
                code=ErrorCodes.NOT_FOUND,
                message=str(e),
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        except ValidationError as e:
            # 参数验证错误（由 service 层抛出）
            return error_response(
                code=ErrorCodes.VALIDATION_ERROR,
                message=str(e),
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        except (DatabaseError, IntegrityError, OperationalError):
            # 数据库错误
            return error_response(
                code=ErrorCodes.SERVER_ERROR,
                message='Database error',
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    # 所有快照相关的 action 和 export 已迁移到 asset/views.py 中的快照 ViewSet
    # GET /api/scans/{id}/subdomains/ -> SubdomainSnapshotViewSet
    # GET /api/scans/{id}/subdomains/export/ -> SubdomainSnapshotViewSet.export
    # GET /api/scans/{id}/websites/ -> WebsiteSnapshotViewSet
    # GET /api/scans/{id}/websites/export/ -> WebsiteSnapshotViewSet.export
    # GET /api/scans/{id}/directories/ -> DirectorySnapshotViewSet
    # GET /api/scans/{id}/directories/export/ -> DirectorySnapshotViewSet.export
    # GET /api/scans/{id}/endpoints/ -> EndpointSnapshotViewSet
    # GET /api/scans/{id}/endpoints/export/ -> EndpointSnapshotViewSet.export
    # GET /api/scans/{id}/ip-addresses/ -> HostPortMappingSnapshotViewSet
    # GET /api/scans/{id}/ip-addresses/export/ -> HostPortMappingSnapshotViewSet.export
    # GET /api/scans/{id}/vulnerabilities/ -> VulnerabilitySnapshotViewSet

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
            return error_response(
                code=ErrorCodes.VALIDATION_ERROR,
                message='Missing required parameter: ids',
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(ids, list):
            return error_response(
                code=ErrorCodes.VALIDATION_ERROR,
                message='ids must be an array',
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        if not all(isinstance(i, int) for i in ids):
            return error_response(
                code=ErrorCodes.VALIDATION_ERROR,
                message='All elements in ids array must be integers',
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 使用 Service 层批量删除（两阶段删除）
            scan_service = ScanService()
            result = scan_service.delete_scans_two_phase(ids)
            
            return success_response(
                data={
                    'deletedCount': result['soft_deleted_count'],
                    'deletedScans': result['scan_names']
                }
            )
            
        except ValueError as e:
            # 未找到记录
            return error_response(
                code=ErrorCodes.NOT_FOUND,
                message=str(e),
                status_code=status.HTTP_404_NOT_FOUND
            )
            
        except Exception as e:
            logger.exception("批量删除扫描任务时发生错误")
            return error_response(
                code=ErrorCodes.SERVER_ERROR,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        获取扫描统计数据
        
        返回扫描任务的汇总统计信息，用于仪表板和扫描历史页面。
        使用缓存字段聚合查询，性能优异。
        
        返回:
        - total: 总扫描次数
        - running: 运行中的扫描数量
        - completed: 已完成的扫描数量
        - failed: 失败的扫描数量
        - totalVulns: 总共发现的漏洞数量
        - totalSubdomains: 总共发现的子域名数量
        - totalEndpoints: 总共发现的端点数量
        - totalAssets: 总资产数
        """
        try:
            # 使用 Service 层获取统计数据
            scan_service = ScanService()
            stats = scan_service.get_statistics()
            
            return success_response(
                data={
                    'total': stats['total'],
                    'running': stats['running'],
                    'completed': stats['completed'],
                    'failed': stats['failed'],
                    'totalVulns': stats['total_vulns'],
                    'totalSubdomains': stats['total_subdomains'],
                    'totalEndpoints': stats['total_endpoints'],
                    'totalWebsites': stats['total_websites'],
                    'totalAssets': stats['total_assets'],
                }
            )
        
        except (DatabaseError, OperationalError):
            return error_response(
                code=ErrorCodes.SERVER_ERROR,
                message='Database error',
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE
            )
    
    @action(detail=True, methods=['post'])
    def stop(self, request, pk=None):  # pylint: disable=unused-argument
        """
        停止扫描任务
        
        URL: POST /api/scans/{id}/stop/
        
        功能:
        - 终止正在运行或初始化的扫描任务
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
                    return error_response(
                        code=ErrorCodes.BAD_REQUEST,
                        message=f'Cannot stop scan: current status is {ScanStatus(scan.status).label}',
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
                # 其他失败原因
                return error_response(
                    code=ErrorCodes.SERVER_ERROR,
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return success_response(
                data={'revokedTaskCount': revoked_count}
            )
        
        except ObjectDoesNotExist:
            return error_response(
                code=ErrorCodes.NOT_FOUND,
                message=f'Scan ID {pk} not found',
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        except (DatabaseError, IntegrityError, OperationalError):
            return error_response(
                code=ErrorCodes.SERVER_ERROR,
                message='Database error',
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE
            )
