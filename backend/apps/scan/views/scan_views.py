"""扫描任务视图集"""

import logging

from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db.utils import DatabaseError, IntegrityError, OperationalError
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter

from apps.common.definitions import ScanStatus
from apps.common.error_codes import ErrorCodes
from apps.common.pagination import BasePagination
from apps.common.response_helpers import error_response, success_response
from apps.targets.repositories import DjangoOrganizationRepository, DjangoTargetRepository

from ..models import Scan
from ..serializers import (
    InitiateScanSerializer,
    QuickScanSerializer,
    ScanHistorySerializer,
    ScanSerializer,
)
from ..services.quick_scan_service import QuickScanService
from ..services.scan_input_target_service import ScanInputTargetService
from ..services.scan_service import ScanService

logger = logging.getLogger(__name__)


def _handle_database_error():
    """处理数据库错误的通用响应"""
    return error_response(
        code=ErrorCodes.SERVER_ERROR,
        message='Database error',
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE
    )


class ScanViewSet(viewsets.ModelViewSet):
    """扫描任务视图集"""

    serializer_class = ScanSerializer
    pagination_class = BasePagination
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['target']
    search_fields = ['target__name']

    def get_queryset(self):
        """优化查询集，提升API性能"""
        scan_service = ScanService()
        return scan_service.get_all_scans(prefetch_relations=True)

    def get_serializer_class(self):
        """根据不同的 action 返回不同的序列化器"""
        if self.action in ['list', 'retrieve']:
            return ScanHistorySerializer
        return ScanSerializer

    def destroy(self, request, *args, **kwargs):
        """删除单个扫描任务（两阶段删除）"""
        try:
            scan = self.get_object()
            scan_service = ScanService()
            result = scan_service.delete_scans_two_phase([scan.id])

            return success_response(data={
                'scanId': scan.id,
                'deletedCount': result['soft_deleted_count'],
                'deletedScans': result['scan_names']
            })

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
        except Exception:
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
        4. 立即发起批量扫描（scan_mode='quick'）
        5. 将用户输入写入 ScanInputTarget 表
        """
        serializer = QuickScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            inputs = [t['name'] for t in data['targets']]

            # 1. 解析输入并创建资产
            result = QuickScanService().process_quick_scan(inputs)

            if not result['targets']:
                return error_response(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='No valid targets for scanning',
                    details=result.get('errors', []),
                    status_code=status.HTTP_400_BAD_REQUEST
                )

            # 2. 创建扫描（scan_mode='quick'）
            created_scans = ScanService().create_scans(
                targets=result['targets'],
                engine_ids=data.get('engine_ids', []),
                engine_names=data.get('engine_names', []),
                yaml_configuration=data['configuration'],
                scan_mode='quick'
            )

            if not created_scans:
                return error_response(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='No scan tasks were created. '
                            'All targets may already have active scans.',
                    details={
                        'targetStats': result['target_stats'],
                        'assetStats': result['asset_stats'],
                        'errors': result.get('errors', [])
                    },
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
                )

            # 3. 将用户输入写入 ScanInputTarget 表
            scan_input_service = ScanInputTargetService()
            target_inputs_map = result.get('target_inputs_map', {})
            for scan in created_scans:
                inputs_for_target = target_inputs_map.get(scan.target.name, [])
                if inputs_for_target:
                    scan_input_service.bulk_create(scan.id, inputs_for_target)

            return success_response(
                data={
                    'count': len(created_scans),
                    'targetStats': result['target_stats'],
                    'assetStats': result['asset_stats'],
                    'errors': result.get('errors', []),
                    'scans': ScanSerializer(created_scans, many=True).data
                },
                status_code=status.HTTP_201_CREATED
            )

        except ValidationError as e:
            return error_response(
                code=ErrorCodes.VALIDATION_ERROR,
                message=str(e),
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except (DatabaseError, IntegrityError, OperationalError):
            logger.exception("快速扫描启动失败")
            return _handle_database_error()

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
        """
        serializer = InitiateScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            targets = self._get_targets_for_scan(
                data.get('organization_id'),
                data.get('target_id')
            )

            created_scans = ScanService().create_scans(
                targets=targets,
                engine_ids=data['engine_ids'],
                engine_names=data['engine_names'],
                yaml_configuration=data['configuration']
            )

            if not created_scans:
                return error_response(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='No scan tasks were created. '
                            'All targets may already have active scans.',
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
                )

            return success_response(
                data={
                    'count': len(created_scans),
                    'scans': ScanSerializer(created_scans, many=True).data
                },
                status_code=status.HTTP_201_CREATED
            )

        except ObjectDoesNotExist as e:
            return error_response(
                code=ErrorCodes.NOT_FOUND,
                message=str(e),
                status_code=status.HTTP_404_NOT_FOUND
            )
        except ValidationError as e:
            return error_response(
                code=ErrorCodes.VALIDATION_ERROR,
                message=str(e),
                status_code=status.HTTP_400_BAD_REQUEST
            )
        except (DatabaseError, IntegrityError, OperationalError):
            return _handle_database_error()

    def _get_targets_for_scan(self, organization_id, target_id):
        """根据组织ID或目标ID获取扫描目标列表"""
        if organization_id:
            org_repo = DjangoOrganizationRepository()
            organization = org_repo.get_by_id(organization_id)
            if not organization:
                raise ObjectDoesNotExist(f'Organization ID {organization_id} 不存在')
            targets = org_repo.get_targets(organization_id)
            if not targets:
                raise ValidationError(f'组织 ID {organization_id} 下没有目标')
            return targets

        target_repo = DjangoTargetRepository()
        target = target_repo.get_by_id(target_id)
        if not target:
            raise ObjectDoesNotExist(f'Target ID {target_id} 不存在')
        return [target]

    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """批量删除扫描记录"""
        ids = request.data.get('ids', [])

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
            scan_service = ScanService()
            result = scan_service.delete_scans_two_phase(ids)

            return success_response(data={
                'deletedCount': result['soft_deleted_count'],
                'deletedScans': result['scan_names']
            })

        except ValueError as e:
            return error_response(
                code=ErrorCodes.NOT_FOUND,
                message=str(e),
                status_code=status.HTTP_404_NOT_FOUND
            )
        except (DatabaseError, IntegrityError, OperationalError):
            logger.exception("批量删除扫描任务时发生错误")
            return _handle_database_error()

    @action(detail=False, methods=['get'])
    def statistics(self, request):  # pylint: disable=unused-argument
        """获取扫描统计数据"""
        try:
            stats = ScanService().get_statistics()

            return success_response(data={
                'total': stats['total'],
                'running': stats['running'],
                'completed': stats['completed'],
                'failed': stats['failed'],
                'totalVulns': stats['total_vulns'],
                'totalSubdomains': stats['total_subdomains'],
                'totalEndpoints': stats['total_endpoints'],
                'totalWebsites': stats['total_websites'],
                'totalAssets': stats['total_assets'],
            })

        except (DatabaseError, OperationalError):
            return _handle_database_error()

    @action(detail=True, methods=['post'])
    def stop(self, request, pk=None):  # pylint: disable=unused-argument
        """停止扫描任务"""
        try:
            scan_service = ScanService()
            success, revoked_count = scan_service.stop_scan(scan_id=pk)

            if not success:
                scan = scan_service.get_scan(scan_id=pk, prefetch_relations=False)
                if scan and scan.status not in [ScanStatus.RUNNING, ScanStatus.INITIATED]:
                    return error_response(
                        code=ErrorCodes.BAD_REQUEST,
                        message=f'Cannot stop scan: current status is '
                                f'{ScanStatus(scan.status).label}',
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
                return error_response(
                    code=ErrorCodes.SERVER_ERROR,
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return success_response(data={'revokedTaskCount': revoked_count})

        except ObjectDoesNotExist:
            return error_response(
                code=ErrorCodes.NOT_FOUND,
                message=f'Scan ID {pk} not found',
                status_code=status.HTTP_404_NOT_FOUND
            )
        except (DatabaseError, IntegrityError, OperationalError):
            return _handle_database_error()
