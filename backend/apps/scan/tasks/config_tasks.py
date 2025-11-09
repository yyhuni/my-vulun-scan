"""
配置解析相关的 Prefect Tasks

[已弃用] 此文件已被重构。
新设计：YAML 配置在专用 flow 中解析，不再需要独立的配置解析任务。

保留此文件是为了防止破坏性变更，未来可以删除。
"""

from prefect import task
import logging
import yaml

logger = logging.getLogger(__name__)


@task(
    name="parse_and_validate_config",
    description="解析并验证引擎 YAML 配置",
    retries=1
)
def parse_engine_config_task(engine_config: str, engine_name: str) -> dict:
    """
    解析并验证引擎的 YAML 配置
    
    职责：
    - 解析 YAML 格式配置
    - 验证配置结构是否有效
    - 验证是否至少有一个启用的任务
    
    Args:
        engine_config: YAML 格式的配置文本
        engine_name: 引擎名称（用于日志）
    
    Returns:
        dict: 解析并验证后的配置字典（保证有效）
    
    Raises:
        ValueError: 配置为空、解析失败或验证失败
    """
    # 1. 基础验证
    if not engine_config or not engine_config.strip():
        raise ValueError(f"Engine {engine_name} 配置为空")
    
    # 2. 解析 YAML
    try:
        config = yaml.safe_load(engine_config)
    except yaml.YAMLError as e:
        logger.error("配置解析失败 - Engine: %s, 错误: %s", engine_name, e)
        raise ValueError(f"引擎配置解析失败: {e}") from e
    
    # 3. 结构验证
    if not config:
        raise ValueError(f"Engine {engine_name} 配置解析后为空")
    
    if not isinstance(config, dict):
        raise ValueError(f"Engine {engine_name} 配置必须是字典结构")
    
    # 4. 业务验证：检查是否至少有一个启用的任务
    enabled_tasks = [
        task_name for task_name, task_config in config.items()
        if isinstance(task_config, dict) and task_config.get('enabled', True)
    ]
    
    if not enabled_tasks:
        raise ValueError(f"Engine {engine_name} 配置中没有启用的任务")
    
    # 5. 日志记录
    logger.info(
        "✓ 配置解析和验证成功 - Engine: %s, 总任务: %d, 启用任务: %s",
        engine_name,
        len(config),
        ', '.join(enabled_tasks)
    )
    
    return config
