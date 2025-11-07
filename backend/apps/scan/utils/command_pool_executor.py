"""
命令池执行管理器模块

提供基于线程池的并行命令执行功能，统一管理系统中所有命令的并发执行
支持全局并发数控制、超时管理、错误处理等功能

设计目标：
- 统一管理所有扫描工具的命令执行（子域名发现、端口扫描等）
- 控制系统级别的并发命令数量，避免资源耗尽
- 提供灵活的配置和监控能力

命令输出日志：
- 通过 settings.COMMAND_LOG_OUTPUT 控制是否记录命令的详细输出
- 启用后，所有命令的执行信息（stdout/stderr）将记录到 command_output.log
- 日志格式模拟终端显示，stdout 和 stderr 按实际执行顺序交错记录
- 开发环境建议启用：export COMMAND_LOG_OUTPUT=True
"""

import logging
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed, Future
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Dict
from enum import Enum

from django.conf import settings

from apps.scan.utils.command_executor import ScanCommandExecutor

logger = logging.getLogger(__name__)

# 在启动时记录命令输出日志状态
if settings.COMMAND_LOG_OUTPUT:
    logger.info("命令输出日志已启用 - 详细输出将记录到 command_output.log")
else:
    logger.debug("命令输出日志未启用 - 设置 COMMAND_LOG_OUTPUT=True 以启用")


class CommandStatus(Enum):
    """命令执行状态枚举"""
    PENDING = "pending"      # 等待执行
    RUNNING = "running"      # 正在执行
    SUCCESS = "success"      # 执行成功
    FAILED = "failed"        # 执行失败
    TIMEOUT = "timeout"      # 执行超时


@dataclass
class CommandTask:
    """
    命令任务数据类
    
    封装单个命令任务的输入参数（不包含执行结果）
    
    Note:
        Task 应该是不可变的输入，执行结果存储在 CommandResult 中
    """
    name: str                           # 任务名称（如 'amass', 'subfinder'）
    command: str                        # 要执行的命令
    output_file: Optional[Path] = None  # 输出文件路径
    validate_output: bool = True        # 是否验证输出文件


@dataclass
class CommandResult:
    """
    命令执行结果数据类
    
    封装单个命令的完整执行结果
    """
    task: CommandTask                   # 原始任务
    success: bool                       # 是否成功
    status: CommandStatus               # 执行状态
    duration: float = 0.0               # 执行耗时（秒）
    output_file: Optional[Path] = None  # 生成的输出文件
    error: Optional[str] = None         # 错误信息
    return_code: Optional[int] = None   # 命令退出码


class CommandPoolExecutor:
    """
    命令池执行管理器
    
    使用线程池并行执行命令，统一管理系统中所有命令的并发执行
    
    特性：
    - 线程池并行执行，可配置最大并发数
    - 全局单例模式，统一管理所有命令执行
    - 支持超时控制、错误处理、结果验证
    - 提供任务执行统计和监控
    
    使用场景：
    - 子域名发现（同时运行多个扫描工具）
    - 端口扫描（并行扫描多个目标）
    - 漏洞扫描（并行执行多个扫描模块）
    
    Example:
        >>> manager = CommandPoolExecutor.get_instance()
        >>> tasks = [
        ...     CommandTask(name='amass', command='amass enum -d example.com', ...),
        ...     CommandTask(name='subfinder', command='subfinder -d example.com', ...),
        ... ]
        >>> results = manager.execute_tasks(tasks)
    """
    
    # ==================== 类变量（单例模式）====================
    
    _instance: Optional['CommandPoolExecutor'] = None
    _lock = threading.Lock()
    
    # 批次ID管理（用于日志追踪）
    _batch_counter = 0
    _counter_lock = threading.Lock()
    
    # ==================== 配置常量 ====================
    
    # 从 settings 读取默认配置
    DEFAULT_MAX_WORKERS: int = settings.COMMAND_POOL_MAX_WORKERS  # 默认最大并发数
    DEFAULT_TIMEOUT: int = settings.COMMAND_TIMEOUT               # 默认超时时间
    
    # ==================== 单例模式 ====================
    
    @classmethod
    def get_instance(cls) -> 'CommandPoolExecutor':
        """
        获取命令池执行管理器单例
        
        Returns:
            CommandPoolExecutor 单例实例
        
        Note:
            - 使用双重检查锁定（DCL）确保线程安全
            - 配置通过 Django settings 统一管理
        """
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls(
                        max_workers=cls.DEFAULT_MAX_WORKERS,
                        default_timeout=cls.DEFAULT_TIMEOUT
                    )
                    logger.info(
                        "命令池执行管理器已初始化 - 最大并发数: %d, 默认超时: %d秒",
                        cls._instance.max_workers,
                        cls._instance.default_timeout
                    )
        return cls._instance
    
    @classmethod
    def _get_next_batch_id(cls) -> int:
        """
        生成递增的批次ID（线程安全）
        
        Returns:
            批次ID（从1开始递增）
        
        Note:
            用于日志追踪，区分不同批次的任务执行
        """
        with cls._counter_lock:
            cls._batch_counter += 1
            return cls._batch_counter
    
    # ==================== 初始化 ====================
    
    def __init__(self, max_workers: int = DEFAULT_MAX_WORKERS, default_timeout: int = DEFAULT_TIMEOUT):
        """
        初始化命令池执行管理器
        
        Args:
            max_workers: 线程池最大并发数
            default_timeout: 默认命令超时时间（秒）
        
        Note:
            通常应该使用 get_instance() 获取单例，而不是直接实例化
        """
        # 验证并设置并发数
        if max_workers < 1:
            logger.warning(
                "max_workers=%d 无效（必须 >= 1），使用默认值 %d",
                max_workers, self.DEFAULT_MAX_WORKERS
            )
            max_workers = self.DEFAULT_MAX_WORKERS
        
        self.max_workers = max_workers
        self.default_timeout = default_timeout
        
        # 创建线程池
        self._executor = ThreadPoolExecutor(
            max_workers=max_workers,
            thread_name_prefix="cmd_pool"
        )
        
        logger.debug(
            "CommandPoolExecutor 初始化完成 - max_workers=%d, default_timeout=%d",
            max_workers, default_timeout
        )
    
    # ==================== 公共方法 ====================
    
    def execute_tasks(
        self,
        tasks: List[CommandTask]
    ) -> List[CommandResult]:
        """
        并行执行多个命令任务
        
        Args:
            tasks: 命令任务列表
        
        Returns:
            命令执行结果列表（顺序与输入任务一致）
        
        Raises:
            ValueError: 任务列表为空
            RuntimeError: 线程池已关闭
        
        Example:
            >>> results = manager.execute_tasks(tasks)
        """
        if not tasks:
            raise ValueError("任务列表不能为空")
        
        # 检查线程池是否已关闭
        # ThreadPoolExecutor 没有提供公共方法检查关闭状态，需要访问 _shutdown 属性
        # pylint: disable=protected-access
        if self._executor._shutdown:
            raise RuntimeError("命令池已关闭，无法提交新任务")
        
        # 生成批次ID用于日志追踪
        batch_id = self._get_next_batch_id()
        
        total_tasks = len(tasks)
        logger.info(
            "[批次#%d] 开始并行执行 %d 个命令任务（最大并发: %d）", 
            batch_id, total_tasks, self.max_workers
        )
        
        # 提交所有任务到线程池
        future_to_task: Dict[Future, CommandTask] = {}
        for task in tasks:
            future = self._executor.submit(self._execute_single_task, task)
            future_to_task[future] = task
        
        # 收集结果（按完成顺序）
        results_map: Dict[str, CommandResult] = {}
        completed_count = 0
        
        for future in as_completed(future_to_task):
            completed_count += 1
            task = future_to_task[future]
            
            try:
                result = future.result()
                results_map[task.name] = result
                
                # 日志输出
                status = "成功" if result.success else "失败"
                logger.info(
                    "[批次#%d][%d/%d] 任务 '%s' %s (耗时: %.2f秒)",
                    batch_id, completed_count, total_tasks, task.name, status, result.duration
                )
            
            except Exception as e:  # noqa: BLE001 - 最后的安全网，确保不抛异常
                # 理论上不应该到这里（_execute_single_task 已处理所有异常）
                logger.error("获取任务结果时发生未预期错误 - 任务 '%s': %s", task.name, e, exc_info=True)
                results_map[task.name] = CommandResult(
                    task=task,
                    success=False,
                    status=CommandStatus.FAILED,
                    error=f"未预期错误: {str(e)}"
                )
        
        # 按原始顺序返回结果
        results = [results_map[task.name] for task in tasks]
        
        # 汇总统计
        success_count = sum(1 for r in results if r.success)
        failed_count = total_tasks - success_count
        
        logger.info(
            "[批次#%d] 命令执行完成 - 总数: %d, 成功: %d, 失败: %d",
            batch_id, total_tasks, success_count, failed_count
        )
        
        return results
    
    # ==================== 私有方法 ====================
    
    def _execute_single_task(self, task: CommandTask) -> CommandResult:
        """
        执行单个命令任务（内部方法）
        
        Args:
            task: 命令任务
        
        Returns:
            命令执行结果
        
        Note:
            此方法捕获所有异常，确保不会向线程池抛出异常
        """
        import time
        
        start_time = time.time()
        timeout = self.default_timeout
        
        logger.debug("开始执行任务 '%s' - 超时: %d秒", task.name, timeout)
        
        try:
            # 使用现有的 ScanCommandExecutor 执行命令
            executor = ScanCommandExecutor(timeout=timeout)
            executor.execute(task.command)
            
            # 验证输出文件（如果需要）
            if task.validate_output and task.output_file:
                if not task.output_file.exists():
                    raise RuntimeError(f"输出文件不存在: {task.output_file}")
                
                if task.output_file.stat().st_size == 0:
                    raise RuntimeError(f"输出文件为空: {task.output_file}")
            
            # 执行成功
            duration = time.time() - start_time
            
            return CommandResult(
                task=task,
                success=True,
                status=CommandStatus.SUCCESS,
                duration=duration,
                output_file=task.output_file
            )
        
        except subprocess.TimeoutExpired:
            # 超时
            duration = time.time() - start_time
            error_msg = f"执行超时 ({timeout}秒)"
            
            logger.warning("任务 '%s' 执行超时", task.name)
            
            return CommandResult(
                task=task,
                success=False,
                status=CommandStatus.TIMEOUT,
                duration=duration,
                error=error_msg
            )
        
        except subprocess.CalledProcessError as e:
            # 命令执行失败
            duration = time.time() - start_time
            error_msg = f"命令执行失败 (退出码: {e.returncode})"
            
            logger.warning("任务 '%s' 执行失败 - 退出码: %d", task.name, e.returncode)
            
            return CommandResult(
                task=task,
                success=False,
                status=CommandStatus.FAILED,
                duration=duration,
                error=error_msg,
                return_code=e.returncode
            )
        
        except (OSError, IOError) as e:
            # 文件系统错误
            duration = time.time() - start_time
            error_msg = f"文件系统错误: {type(e).__name__}: {e}"
            
            logger.error("任务 '%s' 文件系统错误: %s", task.name, e)
            
            return CommandResult(
                task=task,
                success=False,
                status=CommandStatus.FAILED,
                duration=duration,
                error=error_msg
            )
        
        except Exception as e:  # noqa: BLE001 - 最后的安全网，捕获所有未处理的异常
            # 未预期错误
            duration = time.time() - start_time
            error_msg = f"未预期错误: {type(e).__name__}: {e}"
            
            logger.error("任务 '%s' 执行时发生未预期错误: %s", task.name, e, exc_info=True)
            
            return CommandResult(
                task=task,
                success=False,
                status=CommandStatus.FAILED,
                duration=duration,
                error=error_msg
            )


# ==================== 导出接口 ====================

__all__ = [
    'CommandPoolExecutor',
    'CommandTask',
    'CommandResult',
    'CommandStatus',
]

