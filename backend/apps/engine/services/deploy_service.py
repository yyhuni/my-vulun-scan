"""
Worker 部署脚本服务

脚本文件位置：backend/scripts/worker/
- bootstrap.sh: 环境初始化（安装 tmux、curl 等基础依赖）
- deploy.sh: 部署脚本（安装 Docker、拉取镜像）
- watchdog.sh: 看门狗核心逻辑（心跳上报、容器监控）
- watchdog_install.sh: Watchdog 服务安装（Systemd 配置）
- start_worker.sh: Worker 容器启动脚本
"""

from pathlib import Path

# 脚本目录 (从 services 目录往上找)
SCRIPTS_DIR = Path(__file__).parent.parent.parent.parent / "scripts" / "worker"


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
    """获取部署脚本（幂等）"""
    return _read_script("deploy.sh")


def get_watchdog_install_script(api_url: str, worker_id: int) -> str:
    """
    获取 Watchdog 安装脚本（包含 Systemd 配置）
    
    变量替换：
    - {{WATCHDOG_SCRIPT}}: watchdog.sh 内容（已替换 API_URL 和 WORKER_ID）
    """
    # 读取 watchdog 核心脚本并替换变量
    watchdog_script = _read_script("watchdog.sh")
    watchdog_script = watchdog_script.replace("{{API_URL}}", api_url.rstrip('/'))
    watchdog_script = watchdog_script.replace("{{WORKER_ID}}", str(worker_id))
    
    # 读取安装脚本模板并嵌入 watchdog 脚本
    install_script = _read_script("watchdog_install.sh")
    return install_script.replace("{{WATCHDOG_SCRIPT}}", watchdog_script)


def get_start_worker_script(api_url: str) -> str:
    """
    获取 Worker 启动脚本
    
    变量替换：
    - {{API_URL}}: Prefect API 地址
    """
    script = _read_script("start_worker.sh")
    return script.replace("{{API_URL}}", api_url.rstrip('/'))
