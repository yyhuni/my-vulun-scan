"""
Worker 节点 Views
"""
import os
import threading
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.response_helpers import success_response, error_response
from apps.common.error_codes import ErrorCodes
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
        return success_response(
            data={'name': worker_name}
        )
    
    @action(detail=True, methods=['post'])
    def heartbeat(self, request, pk=None):
        """
        接收心跳上报（写 Redis，首次心跳更新部署状态，检查版本）
        
        请求体:
        {
            "cpu_percent": 50.0,
            "memory_percent": 60.0,
            "version": "v1.0.9"
        }
        
        返回:
        {
            "status": "ok",
            "need_update": true/false,
            "server_version": "v1.0.19"
        }
        
        状态流转:
        ┌─────────────────────────────────────────────────────────────────────┐
        │ 场景                        │ 状态变化                              │
        ├─────────────────────────────┼───────────────────────────────────────┤
        │ 首次心跳                    │ pending/deploying → online            │
        │ 远程 Worker 版本不匹配      │ online → updating → (更新成功) online │
        │ 远程 Worker 更新失败        │ updating → outdated                   │
        │ 本地 Worker 版本不匹配      │ online → outdated (需手动 update.sh)  │
        │ 版本匹配                    │ updating/outdated → online            │
        └─────────────────────────────┴───────────────────────────────────────┘
        """
        from apps.engine.services.worker_load_service import worker_load_service
        from django.conf import settings
        
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
        
        # 3. 版本检查：比较 agent 版本与 server 版本
        agent_version = info.get('version', '')
        server_version = settings.IMAGE_TAG  # Server 当前版本
        need_update = False
        
        if agent_version and agent_version != 'unknown':
            # 版本不匹配时通知 agent 更新
            need_update = agent_version != server_version
            if need_update:
                logger.info(
                    f"Worker {worker.name} 版本不匹配: agent={agent_version}, server={server_version}"
                )
                
                # 远程 Worker：服务端主动通过 SSH 触发更新
                if not worker.is_local and worker.ip_address:
                    self._trigger_remote_agent_update(worker, server_version)
                else:
                    # 本地 Worker 版本不匹配：标记为 outdated
                    # 需要用户手动执行 update.sh 更新
                    if worker.status != 'outdated':
                        worker.status = 'outdated'
                        worker.save(update_fields=['status'])
            else:
                # 版本匹配，确保状态为 online
                if worker.status in ('updating', 'outdated'):
                    worker.status = 'online'
                    worker.save(update_fields=['status'])
        
        return success_response(
            data={
                'status': 'ok',
                'needUpdate': need_update,
                'serverVersion': server_version
            }
        )
    
    def _trigger_remote_agent_update(self, worker, target_version: str):
        """
        通过 SSH 触发远程 agent 更新（后台执行，不阻塞心跳响应）
        
        使用 Redis 锁防止重复触发（同一 worker 60秒内只触发一次）
        """
        import redis
        from django.conf import settings as django_settings
        
        redis_url = f"redis://{django_settings.REDIS_HOST}:{django_settings.REDIS_PORT}/{django_settings.REDIS_DB}"
        redis_client = redis.from_url(redis_url)
        lock_key = f"agent_update_lock:{worker.id}"
        
        # 尝试获取锁（60秒过期，防止重复触发）
        if not redis_client.set(lock_key, "1", nx=True, ex=60):
            logger.debug(f"Worker {worker.name} 更新已在进行中，跳过")
            return
        
        # 获取锁成功，设置状态为 updating
        self._set_worker_status(worker.id, 'updating')
        
        # 提取数据避免后台线程访问 ORM
        worker_id = worker.id
        worker_name = worker.name
        ip_address = worker.ip_address
        ssh_port = worker.ssh_port
        username = worker.username
        password = worker.password
        
        def _async_update():
            try:
                logger.info(f"开始远程更新 Worker {worker_name} 到 {target_version}")
                
                # 构建更新命令：拉取新镜像并重启 agent
                docker_user = getattr(django_settings, 'DOCKER_USER', 'yyhuni')
                update_cmd = f'''
                    docker pull {docker_user}/xingrin-agent:{target_version} && \
                    docker stop xingrin-agent 2>/dev/null || true && \
                    docker rm xingrin-agent 2>/dev/null || true && \
                    docker run -d --pull=always \
                        --name xingrin-agent \
                        --restart always \
                        -e HEARTBEAT_API_URL="https://{django_settings.PUBLIC_HOST}:{getattr(django_settings, 'PUBLIC_PORT', '8083')}" \
                        -e WORKER_ID="{worker_id}" \
                        -e IMAGE_TAG="{target_version}" \
                        -v /proc:/host/proc:ro \
                        {docker_user}/xingrin-agent:{target_version}
                '''
                
                success, message = self.worker_service.execute_remote_command(
                    ip_address=ip_address,
                    ssh_port=ssh_port,
                    username=username,
                    password=password,
                    command=update_cmd
                )
                
                if success:
                    logger.info(f"Worker {worker_name} 远程更新成功")
                    # 更新成功后，新 agent 心跳会自动把状态改回 online
                else:
                    logger.warning(f"Worker {worker_name} 远程更新失败: {message}")
                    # 更新失败，标记为 outdated
                    self._set_worker_status(worker_id, 'outdated')
                    
            except Exception as e:
                logger.error(f"Worker {worker_name} 远程更新异常: {e}")
                self._set_worker_status(worker_id, 'outdated')
            finally:
                # 释放锁
                redis_client.delete(lock_key)
        
        # 后台执行，不阻塞心跳响应
        threading.Thread(target=_async_update, daemon=True).start()
    
    def _set_worker_status(self, worker_id: int, status: str):
        """更新 Worker 状态（用于后台线程）"""
        try:
            from apps.engine.models import WorkerNode
            WorkerNode.objects.filter(id=worker_id).update(status=status)
        except Exception as e:
            logger.error(f"更新 Worker {worker_id} 状态失败: {e}")
    
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
            return error_response(
                code=ErrorCodes.VALIDATION_ERROR,
                message='Missing name parameter',
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        worker, created = self.worker_service.register_worker(
            name=name,
            is_local=is_local
        )
        
        return success_response(
            data={
                'workerId': worker.id,
                'name': worker.name,
                'created': created
            }
        )
    
    @action(detail=False, methods=['get'])
    def config(self, request):
        """
        获取任务容器配置（配置中心 API）
        
        Worker 启动时调用此接口获取完整配置，实现配置中心化管理。
        Worker 通过 IS_LOCAL 环境变量声明身份，请求时带上 ?is_local=true/false 参数。
        
        请求参数:
            is_local: true/false - Worker 是否为本地节点（Docker 网络内）
        
        返回:
        {
            "db": {"host": "...", "port": "...", ...},
            "paths": {"results": "...", "logs": "..."}
        }
        
        配置逻辑:
            - 本地 Worker (is_local=true): db_host=postgres
            - 远程 Worker (is_local=false): db_host=PUBLIC_HOST
        """
        from django.conf import settings
        import logging
        logger = logging.getLogger(__name__)
        
        # 从请求参数获取 Worker 身份（由 Worker 自己声明）
        # 不再依赖 IP 判断，避免不同网络环境下的兼容性问题
        is_local_param = request.query_params.get('is_local', '').lower()
        is_local_worker = is_local_param == 'true'
        
        # 根据请求来源返回不同的数据库地址
        db_host = settings.DATABASES['default']['HOST']
        _is_internal_db = db_host in ('postgres', 'localhost', '127.0.0.1')
        
        logger.info(
            "Worker 配置请求 - is_local_param: %s, is_local_worker: %s, db_host: %s, is_internal_db: %s",
            is_local_param, is_local_worker, db_host, _is_internal_db
        )
        
        if _is_internal_db:
            # 本地数据库场景
            if is_local_worker:
                # 本地 Worker：直接用 Docker 内部服务名
                worker_db_host = 'postgres'
            else:
                # 远程 Worker：通过公网 IP 访问
                public_host = settings.PUBLIC_HOST
                if public_host in ('server', 'localhost', '127.0.0.1'):
                    logger.warning("远程 Worker 请求配置，但 PUBLIC_HOST=%s 不是有效的公网地址", public_host)
                worker_db_host = public_host
        else:
            # 远程数据库场景：所有 Worker 都用 DB_HOST
            worker_db_host = db_host
        
        logger.info("返回 Worker 配置 - db_host: %s", worker_db_host)
        
        return success_response(
            data={
                'db': {
                    'host': worker_db_host,
                    'port': str(settings.DATABASES['default']['PORT']),
                    'name': settings.DATABASES['default']['NAME'],
                    'user': settings.DATABASES['default']['USER'],
                    'password': settings.DATABASES['default']['PASSWORD'],
                },
                'paths': {
                    'results': getattr(settings, 'CONTAINER_RESULTS_MOUNT', '/opt/xingrin/results'),
                    'logs': getattr(settings, 'CONTAINER_LOGS_MOUNT', '/opt/xingrin/logs'),
                },
                'logging': {
                    'level': os.getenv('LOG_LEVEL', 'INFO'),
                    'enableCommandLogging': os.getenv('ENABLE_COMMAND_LOGGING', 'true').lower() == 'true',
                },
                'debug': settings.DEBUG,
            }
        )
