"""
Worker 节点 Views
"""
import os
import threading
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.engine.serializers import WorkerNodeSerializer
from apps.engine.services import WorkerService
from apps.common.signals import worker_delete_failed

logger = logging.getLogger(__name__)


class WorkerNodeViewSet(viewsets.ModelViewSet):
    """
    Worker 节点 ViewSet
    
    HTTP API:
    - GET /api/workers/ - 获取节点列表
    - POST /api/workers/ - 创建节点
    - DELETE /api/workers/{id}/ - 删除节点（同时执行远程卸载）
    - POST /api/workers/{id}/heartbeat/ - 心跳上报
    
    部署通过 WebSocket 终端进行:
    - ws://host/ws/workers/{id}/deploy/
    """
    
    serializer_class = WorkerNodeSerializer

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.worker_service = WorkerService()

    def get_queryset(self):
        """通过服务层获取 Worker 查询集"""
        return self.worker_service.get_all_workers()
    
    def get_serializer_context(self):
        """传入批量查询的 Redis 负载数据，避免 N+1 查询"""
        context = super().get_serializer_context()
        
        # 仅在 list 操作时批量预加载
        if self.action == 'list':
            from apps.engine.services.worker_load_service import worker_load_service
            queryset = self.get_queryset()
            worker_ids = list(queryset.values_list('id', flat=True))
            context['loads'] = worker_load_service.get_all_loads(worker_ids)
        
        return context
    
    def destroy(self, request, *args, **kwargs):
        """
        删除 Worker 节点
        
        流程：
        1. 后台线程执行远程卸载脚本
        2. 卸载完成后删除数据库记录
        3. 发送通知
        """
        worker = self.get_object()
        
        # 在主线程中提取所有需要的数据（避免后台线程访问 ORM 对象）
        worker_id = worker.id
        worker_name = worker.name
        ip_address = worker.ip_address
        ssh_port = worker.ssh_port
        username = worker.username
        password = worker.password
        
        # 1. 删除 Redis 中的负载数据
        from apps.engine.services.worker_load_service import worker_load_service
        worker_load_service.delete_load(worker_id)
        
        # 2. 删除数据库记录（立即生效，前端刷新时不会再看到）
        self.worker_service.delete_worker(worker_id)
        
        def _async_remote_uninstall():
            """后台执行远程卸载"""
            try:
                success, message = self.worker_service.remote_uninstall(
                    worker_id=worker_id,
                    ip_address=ip_address,
                    ssh_port=ssh_port,
                    username=username,
                    password=password
                )
                if success:
                    logger.info(f"Worker {worker_name} 远程卸载成功")
                else:
                    logger.warning(f"Worker {worker_name} 远程卸载: {message}")
                    # 卸载失败时发送通知
                    worker_delete_failed.send(
                        sender=self.__class__,
                        worker_name=worker_name,
                        message=message
                    )
            except Exception as e:
                logger.error(f"Worker {worker_name} 远程卸载失败: {e}")
                worker_delete_failed.send(
                    sender=self.__class__,
                    worker_name=worker_name,
                    message=str(e)
                )
        
        # 2. 后台线程执行远程卸载（不阻塞响应）
        threading.Thread(target=_async_remote_uninstall, daemon=True).start()
        
        # 3. 立即返回成功
        return Response(
            {"message": f"节点 {worker_name} 已删除"},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def heartbeat(self, request, pk=None):
        """接收心跳上报（写 Redis，首次心跳更新部署状态）"""
        from apps.engine.services.worker_load_service import worker_load_service
        
        worker = self.get_object()
        info = request.data if request.data else {}
        
        # 1. 写入 Redis（实时负载数据，TTL=60秒）
        cpu = info.get('cpu_percent', 0)
        mem = info.get('memory_percent', 0)
        worker_load_service.update_load(worker.id, cpu, mem)
        
        # 2. 首次心跳：更新状态为 online
        if worker.status not in ('online', 'offline'):
            worker.status = 'online'
            worker.save(update_fields=['status'])
        
        return Response({'status': 'ok'})
    
    @action(detail=False, methods=['post'])
    def register(self, request):
        """
        Worker 自注册 API
        
        本地 Worker 启动时调用此接口注册自己。
        如果同名节点已存在，返回现有记录；否则创建新记录。
        
        请求体:
        {
            "name": "Local-Scan-Worker",
            "is_local": true
        }
        
        返回:
        {
            "worker_id": 1,
            "name": "Local-Scan-Worker",
            "created": false  # true 表示新创建，false 表示已存在
        }
        """
        name = request.data.get('name')
        is_local = request.data.get('is_local', True)
        
        if not name:
            return Response(
                {'error': '缺少 name 参数'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        worker, created = self.worker_service.register_worker(
            name=name,
            is_local=is_local
        )
        
        return Response({
            'worker_id': worker.id,
            'name': worker.name,
            'created': created
        })
    
    def _get_client_ip(self, request) -> str:
        """获取客户端真实 IP"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')
    
    def _is_local_request(self, client_ip: str) -> bool:
        """
        判断是否为本地请求（Docker 网络内部）
        
        本地请求特征：
        - 来自 Docker 网络内部（172.x.x.x）
        - 来自 localhost（127.0.0.1）
        """
        if not client_ip:
            return True  # 无法获取 IP 时默认为本地
        
        # Docker 默认网络段
        if client_ip.startswith('172.') or client_ip.startswith('10.'):
            return True
        
        # localhost
        if client_ip in ('127.0.0.1', '::1', 'localhost'):
            return True
        
        return False
    
    @action(detail=False, methods=['get'])
    def config(self, request):
        """
        获取任务容器配置（配置中心 API）
        
        Worker 启动时调用此接口获取完整配置，实现配置中心化管理。
        Worker 只需知道 SERVER_URL，其他配置由此 API 动态返回。
        
        ┌─────────────────────────────────────────────────────────────┐
        │                    配置分发流程                              │
        ├─────────────────────────────────────────────────────────────┤
        │                                                             │
        │   Worker 启动                                               │
        │       │                                                     │
        │       ▼                                                     │
        │   GET /api/workers/config/                                  │
        │       │                                                     │
        │       ▼                                                     │
        │   ┌─────────────────────┐                                   │
        │   │ _get_client_ip()    │ ← 获取请求来源 IP                  │
        │   │ (X-Forwarded-For    │   (支持 Nginx 代理场景)            │
        │   │  或 REMOTE_ADDR)    │                                   │
        │   └─────────┬───────────┘                                   │
        │             │                                               │
        │             ▼                                               │
        │   ┌─────────────────────┐                                   │
        │   │ _is_local_request() │ ← 判断是否为 Docker 网络内部请求   │
        │   │ 172.x.x.x / 10.x.x.x│   (Docker 默认网段)               │
        │   │ 127.0.0.1 / ::1     │   (localhost)                     │
        │   └─────────┬───────────┘                                   │
        │             │                                               │
        │     ┌───────┴───────┐                                       │
        │     ▼               ▼                                       │
        │  本地 Worker     远程 Worker                                 │
        │  (Docker内)      (公网访问)                                  │
        │     │               │                                       │
        │     ▼               ▼                                       │
        │  db: postgres    db: PUBLIC_HOST                            │
        │  redis: redis    redis: PUBLIC_HOST:6379                    │
        │                                                             │
        └─────────────────────────────────────────────────────────────┘
        
        返回:
        {
            "db": {"host": "...", "port": "...", ...},
            "redisUrl": "...",
            "paths": {"results": "...", "logs": "..."}
        }
        """
        from django.conf import settings
        
        # 判断请求来源：本地 Worker 还是远程 Worker
        # 本地 Worker 在 Docker 网络内，可以直接访问 postgres 服务
        # 远程 Worker 需要通过公网 IP 访问
        client_ip = self._get_client_ip(request)
        is_local_worker = self._is_local_request(client_ip)
        
        # 根据请求来源返回不同的数据库地址
        db_host = settings.DATABASES['default']['HOST']
        _is_internal_db = db_host in ('postgres', 'localhost', '127.0.0.1')
        
        if _is_internal_db:
            # 本地数据库场景
            if is_local_worker:
                # 本地 Worker：直接用 Docker 内部服务名
                worker_db_host = 'postgres'
                worker_redis_url = 'redis://redis:6379/0'
            else:
                # 远程 Worker：通过公网 IP 访问
                worker_db_host = settings.PUBLIC_HOST
                worker_redis_url = f'redis://{settings.PUBLIC_HOST}:6379/0'
        else:
            # 远程数据库场景：所有 Worker 都用 DB_HOST
            worker_db_host = db_host
            worker_redis_url = getattr(settings, 'WORKER_REDIS_URL', 'redis://redis:6379/0')
        
        return Response({
            'db': {
                'host': worker_db_host,
                'port': str(settings.DATABASES['default']['PORT']),
                'name': settings.DATABASES['default']['NAME'],
                'user': settings.DATABASES['default']['USER'],
                'password': settings.DATABASES['default']['PASSWORD'],
            },
            'redisUrl': worker_redis_url,
            'paths': {
                'results': getattr(settings, 'CONTAINER_RESULTS_MOUNT', '/app/backend/results'),
                'logs': getattr(settings, 'CONTAINER_LOGS_MOUNT', '/app/backend/logs'),
            },
            'logging': {
                'level': os.getenv('LOG_LEVEL', 'INFO'),
                'enableCommandLogging': os.getenv('ENABLE_COMMAND_LOGGING', 'true').lower() == 'true',
            },
            'debug': settings.DEBUG
        })
