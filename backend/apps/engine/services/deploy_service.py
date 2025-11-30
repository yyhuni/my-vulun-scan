"""
Worker 部署脚本服务

脚本文件位置：backend/scripts/worker-deploy/
- bootstrap.sh: 环境初始化（安装 git、tmux、curl 等基础依赖）
- worker-install.sh: Worker 安装脚本（安装 Docker、拉取代码、构建镜像）
- start-worker.sh: Worker 容器启动脚本
- watchdog.sh: 看门狗核心逻辑（心跳上报、容器监控）
- watchdog-install.sh: Watchdog 服务安装（Systemd 配置）
"""

from pathlib import Path
import os
from django.conf import settings

# 脚本目录 (从 services 目录往上找)
SCRIPTS_DIR = Path(__file__).parent.parent.parent.parent / "scripts" / "worker-deploy"


def _read_script(filename: str) -> str:
    """读取脚本文件内容"""
    script_path = SCRIPTS_DIR / filename
    if script_path.exists():
        return script_path.read_text()
    else:
        raise FileNotFoundError(f"脚本文件不存在: {script_path}")


def get_bootstrap_script() -> str:
    """获取环境初始化脚本（幂等）"""
    return _read_script("bootstrap.sh")


def get_deploy_script() -> str:
    """获取 Worker 安装脚本（幂等）- Docker + 代码 + 镜像"""
    return _read_script("worker-install.sh")


def get_watchdog_install_script(api_url: str, worker_id: int) -> str:
    """
    获取 Watchdog 安装脚本（包含 Systemd 配置）
    
    变量替换：
    - {{HEARTBEAT_API_URL}}: 心跳上报地址
    - {{WORKER_ID}}: Worker ID
    - {{WATCHDOG_SCRIPT_CONTENT}}: watchdog.sh 的完整内容
    """
    # 读取 watchdog 安装脚本和 watchdog.sh 内容
    install_script = _read_script("watchdog-install.sh")
    watchdog_script = _read_script("watchdog.sh")
    
    # 替换变量
    install_script = install_script.replace("{{HEARTBEAT_API_URL}}", api_url.rstrip('/'))
    install_script = install_script.replace("{{WORKER_ID}}", str(worker_id))
    install_script = install_script.replace("{{WATCHDOG_SCRIPT_CONTENT}}", watchdog_script)
    
    return install_script


def get_start_worker_script(api_url: str, host_address: str = None) -> str:
    """
    获取 Worker 启动脚本
    
    :param api_url: Prefect API 地址
    :param host_address: 主机公网地址（域名或IP），用于替换本地 DB_HOST
    """
    script = _read_script("start-worker.sh")
    
    # 获取数据库配置
    db_config = settings.DATABASES['default']
    db_host = db_config.get('HOST', '')
    
    # 智能替换 DB_HOST
    # 如果配置的是本地地址，则替换为公网 Host
    if host_address and db_host in ['postgres', 'localhost', '127.0.0.1', '']:
        db_host = host_address.split(':')[0]  # 去掉端口（如果是 IP:Port 格式）
        
    # 智能替换 REDIS_HOST (通常与 DB_HOST 逻辑一致)
    redis_host = settings.CACHES['default'].get('LOCATION', 'redis://redis:6379/0')
    # 简单解析 redis://redis:6379/0 -> redis
    if '://' in redis_host:
        redis_host = redis_host.split('://')[1].split(':')[0]
    
    if host_address and redis_host in ['redis', 'localhost', '127.0.0.1', '']:
        redis_host = host_address.split(':')[0]
    
    # 替换变量
    public_host_env = getattr(settings, 'PUBLIC_HOST', '')
    script = script.replace("{{PREFECT_API_URL}}", api_url.rstrip('/'))
    script = script.replace("{{DB_NAME}}", db_config.get('NAME', ''))
    script = script.replace("{{DB_USER}}", db_config.get('USER', ''))
    script = script.replace("{{DB_PASSWORD}}", db_config.get('PASSWORD', ''))
    script = script.replace("{{DB_HOST}}", db_host)
    script = script.replace("{{DB_PORT}}", str(db_config.get('PORT', '5432')))
    script = script.replace("{{REDIS_HOST}}", redis_host)
    script = script.replace("{{REDIS_PORT}}", "6379")  # 假设标准端口
    script = script.replace("{{PUBLIC_HOST}}", public_host_env)
    
    return script
