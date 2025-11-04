from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ObjectDoesNotExist

from .models import Scan
from .serializers import ScanSerializer
from .services.scan_service import ScanService
from apps.targets.models import Target, Organization
from apps.engine.models import ScanEngine


class ScanViewSet(viewsets.ModelViewSet):
    """扫描任务视图集"""
    queryset = Scan.objects.all()  # type: ignore  # pylint: disable=no-member
    serializer_class = ScanSerializer
    
    @action(detail=False, methods=['post'])
    def initiate(self, request):
        """
        发起扫描任务
        
        请求参数:
        - organization_id: 组织ID (int, 可选)
        - target_id: 目标ID (int, 可选)
        - engine: 扫描引擎ID (int, 必填)
        
        注意: organization_id 和 target_id 二选一
        
        返回:
        - 扫描任务详情（单个或多个）
        """
        # 获取请求数据
        organization_id = request.data.get('organization_id')
        target_id = request.data.get('target_id')
        engine_id = request.data.get('engine')
        
        # 参数验证
        if not engine_id:
            return Response(
                {'error': '缺少必填参数: engine'},
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
                # 根据组织ID获取所有目标
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
                engine=engine,
                auto_start=True
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
        except Exception as e:  # noqa: BLE001
            return Response(
                {'error': f'发起扫描失败: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
