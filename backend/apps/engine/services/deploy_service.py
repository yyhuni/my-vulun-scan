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
    """
    # 读取 watchdog 安装脚本
    install_script = _read_script("watchdog-install.sh")
    
    # 替换变量
    install_script = install_script.replace("{{HEARTBEAT_API_URL}}", api_url.rstrip('/'))
    install_script = install_script.replace("{{WORKER_ID}}", str(worker_id))
    
    return install_script


def get_start_worker_script(api_url: str) -> str:
    """
    获取 Worker 启动脚本
    
    变量替换：
    - {{PREFECT_API_URL}}: Prefect API 地址
    - {{DB_*}}: 数据库配置（从 settings 获取）
    """
    script = _read_script("start-worker.sh")
    
    # 获取数据库配置
    db_config = settings.DATABASES['default']
    
    # 替换变量
    script = script.replace("{{PREFECT_API_URL}}", api_url.rstrip('/'))
    script = script.replace("{{DB_NAME}}", db_config.get('NAME', ''))
    script = script.replace("{{DB_USER}}", db_config.get('USER', ''))
    script = script.replace("{{DB_PASSWORD}}", db_config.get('PASSWORD', ''))
    script = script.replace("{{DB_HOST}}", db_config.get('HOST', ''))
    script = script.replace("{{DB_PORT}}", str(db_config.get('PORT', '5432')))
    
    return script
