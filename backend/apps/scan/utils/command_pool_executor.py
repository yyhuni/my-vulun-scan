"""
命令池执行管理器模块

提供基于线程池的并行命令执行功能，统一管理系统中所有命令的并发执行
支持全局并发数控制、超时管理、错误处理等功能

设计目标：
- 统一管理所有扫描工具的命令执行（子域名发现、端口扫描等）
- 控制系统级别的并发命令数量，避免资源耗尽
- 提供灵活的配置和监控能力
"""

import logging
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed, Future
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Dict, Callable
from enum import Enum

from django.conf import settings

from apps.scan.utils.command_executor import ScanCommandExecutor

logger = logging.getLogger(__name__)


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
    
    封装单个命令任务的所有信息
    """
    name: str                           # 任务名称（如 'amass', 'subfinder'）
    command: str                        # 要执行的命令
    output_file: Optional[Path] = None  # 输出文件路径
    validate_output: bool = True        # 是否验证输出文件
    
    # 执行结果
    status: CommandStatus = CommandStatus.PENDING
    error_message: Optional[str] = None
    return_code: Optional[int] = None


@dataclass
class CommandResult:
    """
    命令执行结果数据类
    
    封装单个命令的执行结果
    """
    task: CommandTask                   # 原始任务
    success: bool                       # 是否成功
    output_file: Optional[Path] = None  # 生成的输出文件
    error: Optional[str] = None         # 错误信息
    duration: float = 0.0               # 执行耗时（秒）


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
    def reset_instance(cls) -> None:
        """
        重置单例实例（主要用于测试）
        
        警告：会关闭线程池，确保没有任务正在执行
        """
        with cls._lock:
            if cls._instance is not None:
                cls._instance.shutdown()
                cls._instance = None
                logger.warning("命令池执行管理器已重置")
    
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
        
        # 统计信息
        self._stats = {
            'total_executed': 0,
            'total_success': 0,
            'total_failed': 0,
            'total_timeout': 0,
        }
        self._stats_lock = threading.Lock()
        
        logger.debug(
            "CommandPoolExecutor 初始化完成 - max_workers=%d, default_timeout=%d",
            max_workers, default_timeout
        )
    
    # ==================== 公共方法 ====================
    
    def execute_tasks(
        self,
        tasks: List[CommandTask],
        progress_callback: Optional[Callable[[CommandResult], None]] = None
    ) -> List[CommandResult]:
        """
        并行执行多个命令任务
        
        Args:
            tasks: 命令任务列表
            progress_callback: 进度回调函数，每个任务完成时调用
                              回调参数: CommandResult
        
        Returns:
            命令执行结果列表（顺序与输入任务一致）
        
        Raises:
            ValueError: 任务列表为空
            RuntimeError: 线程池已关闭
        
        Example:
            >>> def on_progress(result: CommandResult):
            ...     print(f"{result.task.name}: {'成功' if result.success else '失败'}")
            >>> 
            >>> results = manager.execute_tasks(tasks, progress_callback=on_progress)
        """
        if not tasks:
            raise ValueError("任务列表不能为空")
        
        # 检查线程池是否已关闭
        try:
            # 尝试提交一个虚拟任务来检查线程池状态
            test_future = self._executor.submit(lambda: None)
            test_future.result(timeout=0.1)
        except RuntimeError as e:
            if "shutdown" in str(e).lower():
                raise RuntimeError("命令池已关闭") from e
        
        total_tasks = len(tasks)
        logger.info("开始并行执行 %d 个命令任务（最大并发: %d）", total_tasks, self.max_workers)
        
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
                
                # 更新统计
                self._update_stats(result)
                
                # 进度回调
                if progress_callback:
                    try:
                        progress_callback(result)
                    except Exception as e:  # noqa: BLE001 - 回调失败不应影响主流程
                        logger.warning("进度回调函数执行失败 - 任务 '%s': %s", task.name, e)
                
                # 日志输出
                status = "成功" if result.success else "失败"
                logger.info(
                    "[%d/%d] 任务 '%s' %s (耗时: %.2f秒)",
                    completed_count, total_tasks, task.name, status, result.duration
                )
            
            except Exception as e:  # noqa: BLE001 - 最后的安全网，确保不抛异常
                # 理论上不应该到这里（_execute_single_task 已处理所有异常）
                logger.error("获取任务结果时发生未预期错误 - 任务 '%s': %s", task.name, e, exc_info=True)
                results_map[task.name] = CommandResult(
                    task=task,
                    success=False,
                    error=f"未预期错误: {str(e)}"
                )
        
        # 按原始顺序返回结果
        results = [results_map[task.name] for task in tasks]
        
        # 汇总统计
        success_count = sum(1 for r in results if r.success)
        failed_count = total_tasks - success_count
        
        logger.info(
            "命令执行完成 - 总数: %d, 成功: %d, 失败: %d",
            total_tasks, success_count, failed_count
        )
        
        return results
    
    def execute_single_command(
        self,
        name: str,
        command: str,
        output_file: Optional[Path] = None,
        validate_output: bool = True
    ) -> CommandResult:
        """
        执行单个命令（便捷方法）
        
        Args:
            name: 命令名称
            command: 要执行的命令
            output_file: 输出文件路径
            validate_output: 是否验证输出文件
        
        Returns:
            命令执行结果
        
        Note:
            超时时间使用全局配置 COMMAND_TIMEOUT
        
        Example:
            >>> result = manager.execute_single_command(
            ...     name='amass',
            ...     command='amass enum -d example.com -o /tmp/amass.txt',
            ...     output_file=Path('/tmp/amass.txt')
            ... )
        """
        task = CommandTask(
            name=name,
            command=command,
            output_file=output_file,
            validate_output=validate_output
        )
        return self._execute_single_task(task)
 
    
    def shutdown(self, wait: bool = True) -> None:
        """
        关闭线程池
        
        Args:
            wait: 是否等待正在执行的任务完成
        
        Note:
            关闭后不能再提交新任务
        """
        logger.info("正在关闭命令池执行管理器...")
        self._executor.shutdown(wait=wait)
        logger.info("命令池执行管理器已关闭")
    
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
        
        # 更新任务状态
        task.status = CommandStatus.RUNNING
        
        logger.debug("开始执行任务 '%s' - 超时: %d秒", task.name, timeout)
        
        try:
            # 使用现有的 ScanCommandExecutor 执行命令
            executor = ScanCommandExecutor(timeout=timeout)
            executor.execute_scan_tool(task.name, task.command)
            
            # 验证输出文件（如果需要）
            if task.validate_output and task.output_file:
                if not task.output_file.exists():
                    raise RuntimeError(f"输出文件不存在: {task.output_file}")
                
                if task.output_file.stat().st_size == 0:
                    raise RuntimeError(f"输出文件为空: {task.output_file}")
            
            # 执行成功
            duration = time.time() - start_time
            task.status = CommandStatus.SUCCESS
            
            return CommandResult(
                task=task,
                success=True,
                output_file=task.output_file,
                duration=duration
            )
        
        except subprocess.TimeoutExpired:
            # 超时
            duration = time.time() - start_time
            task.status = CommandStatus.TIMEOUT
            error_msg = f"执行超时 ({timeout}秒)"
            task.error_message = error_msg
            
            logger.warning("任务 '%s' 执行超时", task.name)
            
            return CommandResult(
                task=task,
                success=False,
                error=error_msg,
                duration=duration
            )
        
        except subprocess.CalledProcessError as e:
            # 命令执行失败
            duration = time.time() - start_time
            task.status = CommandStatus.FAILED
            task.return_code = e.returncode
            error_msg = f"命令执行失败 (退出码: {e.returncode})"
            task.error_message = error_msg
            
            logger.warning("任务 '%s' 执行失败 - 退出码: %d", task.name, e.returncode)
            
            return CommandResult(
                task=task,
                success=False,
                error=error_msg,
                duration=duration
            )
        
        except (OSError, IOError) as e:
            # 文件系统错误
            duration = time.time() - start_time
            task.status = CommandStatus.FAILED
            error_msg = f"文件系统错误: {type(e).__name__}: {e}"
            task.error_message = error_msg
            
            logger.error("任务 '%s' 文件系统错误: %s", task.name, e)
            
            return CommandResult(
                task=task,
                success=False,
                error=error_msg,
                duration=duration
            )
        
        except Exception as e:  # noqa: BLE001 - 最后的安全网，捕获所有未处理的异常
            # 未预期错误
            duration = time.time() - start_time
            task.status = CommandStatus.FAILED
            error_msg = f"未预期错误: {type(e).__name__}: {e}"
            task.error_message = error_msg
            
            logger.error("任务 '%s' 执行时发生未预期错误: %s", task.name, e, exc_info=True)
            
            return CommandResult(
                task=task,
                success=False,
                error=error_msg,
                duration=duration
            )
    
    def _update_stats(self, result: CommandResult) -> None:
        """
        更新统计信息
        
        Args:
            result: 命令执行结果
        """
        with self._stats_lock:
            self._stats['total_executed'] += 1
            
            if result.success:
                self._stats['total_success'] += 1
            else:
                self._stats['total_failed'] += 1
                
                if result.task.status == CommandStatus.TIMEOUT:
                    self._stats['total_timeout'] += 1


# ==================== 便捷函数 ====================

def get_command_pool() -> CommandPoolExecutor:
    """
    获取命令池执行管理器单例（便捷函数）
    
    Returns:
        CommandPoolExecutor 单例实例
    
    Note:
        配置通过 Django settings 统一管理：
        - COMMAND_POOL_MAX_WORKERS: 最大并发数
        - COMMAND_TIMEOUT: 默认超时时间
    
    Example:
        >>> pool = get_command_pool()
    """
    return CommandPoolExecutor.get_instance()


# ==================== 导出接口 ====================

__all__ = [
    'CommandPoolExecutor',
    'CommandTask',
    'CommandResult',
    'CommandStatus',
    'get_command_pool',
]

