"""
工作空间相关的 Prefect Tasks

负责扫描工作空间的创建、验证和管理
"""

from pathlib import Path
from prefect import task
import logging

logger = logging.getLogger(__name__)


@task(
    name="create_workspace",
    description="创建并验证扫描工作空间目录",
    retries=2,
    retry_delay_seconds=5
)
def create_workspace_task(workspace_dir: str) -> Path:
    """
    创建并验证扫描工作空间目录
    
    Args:
        workspace_dir: 工作空间目录路径
    
    Returns:
        Path: 创建的工作空间路径对象
    
    Raises:
        OSError: 目录创建失败或不可写
    """
    workspace_path = Path(workspace_dir)
    
    # 创建目录
    try:
        workspace_path.mkdir(parents=True, exist_ok=True)
        logger.info("✓ 工作空间已创建: %s", workspace_path)
    except OSError as e:
        logger.error("创建工作空间失败: %s - %s", workspace_dir, e)
        raise
    
    # 验证目录是否可写
    test_file = workspace_path / ".test_write"
    try:
        test_file.touch()
        test_file.unlink()
        logger.info("✓ 工作空间验证通过（可写）: %s", workspace_path)
    except OSError as e:
        error_msg = f"工作空间不可写: {workspace_path}"
        logger.error("%s - %s", error_msg, e)
        raise OSError(error_msg) from e
    
    return workspace_path
