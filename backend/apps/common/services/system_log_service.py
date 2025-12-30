"""
系统日志服务模块

提供系统日志的读取功能，支持：
- 从日志目录读取日志文件
- 限制返回行数，防止内存溢出
- 列出可用的日志文件
"""

import fnmatch
import logging
import os
import subprocess
from datetime import datetime, timezone
from typing import TypedDict


logger = logging.getLogger(__name__)


class LogFileInfo(TypedDict):
    """日志文件信息"""
    filename: str
    category: str  # 'system' | 'error' | 'performance' | 'container'
    size: int
    modifiedAt: str  # ISO 8601 格式


class SystemLogService:
    """
    系统日志服务类
    
    负责读取系统日志文件，支持从容器内路径或宿主机挂载路径读取日志。
    """
    
    # 日志文件分类规则
    CATEGORY_RULES = [
        ('xingrin.log', 'system'),
        ('xingrin_error.log', 'error'),
        ('performance.log', 'performance'),
        ('container_*.log', 'container'),
    ]
    
    def __init__(self):
        # 日志目录路径
        self.log_dir = "/opt/xingrin/logs"
        self.default_file = "xingrin.log"  # 默认日志文件
        self.default_lines = 200           # 默认返回行数
        self.max_lines = 10000             # 最大返回行数限制
        self.timeout_seconds = 3           # tail 命令超时时间

    def _categorize_file(self, filename: str) -> str | None:
        """
        根据文件名判断日志分类
        
        Returns:
            分类名称，如果不是日志文件则返回 None
        """
        for pattern, category in self.CATEGORY_RULES:
            if fnmatch.fnmatch(filename, pattern):
                return category
        return None

    def _validate_filename(self, filename: str) -> bool:
        """
        验证文件名是否合法（防止路径遍历攻击）
        
        Args:
            filename: 要验证的文件名
            
        Returns:
            bool: 文件名是否合法
        """
        # 不允许包含路径分隔符
        if '/' in filename or '\\' in filename:
            return False
        # 不允许 .. 路径遍历
        if '..' in filename:
            return False
        # 必须是已知的日志文件类型
        return self._categorize_file(filename) is not None

    def get_log_files(self) -> list[LogFileInfo]:
        """
        获取所有可用的日志文件列表
        
        Returns:
            日志文件信息列表，按分类和文件名排序
        """
        files: list[LogFileInfo] = []
        
        if not os.path.isdir(self.log_dir):
            logger.warning("日志目录不存在: %s", self.log_dir)
            return files
        
        for filename in os.listdir(self.log_dir):
            filepath = os.path.join(self.log_dir, filename)
            
            # 只处理文件，跳过目录
            if not os.path.isfile(filepath):
                continue
            
            # 判断分类
            category = self._categorize_file(filename)
            if category is None:
                continue
            
            # 获取文件信息
            try:
                stat = os.stat(filepath)
                modified_at = datetime.fromtimestamp(
                    stat.st_mtime, tz=timezone.utc
                ).isoformat()
                
                files.append({
                    'filename': filename,
                    'category': category,
                    'size': stat.st_size,
                    'modifiedAt': modified_at,
                })
            except OSError as e:
                logger.warning("获取文件信息失败 %s: %s", filepath, e)
                continue
        
        # 排序：按分类优先级（system > error > performance > container），然后按文件名
        category_order = {'system': 0, 'error': 1, 'performance': 2, 'container': 3}
        files.sort(key=lambda f: (category_order.get(f['category'], 99), f['filename']))
        
        return files

    def get_logs_content(self, filename: str | None = None, lines: int | None = None) -> str:
        """
        获取系统日志内容
        
        Args:
            filename: 日志文件名，默认为 xingrin.log
            lines: 返回的日志行数，默认 200 行，最大 10000 行
            
        Returns:
            str: 日志内容，每行以换行符分隔，保持原始顺序
            
        Raises:
            ValueError: 文件名不合法
            FileNotFoundError: 日志文件不存在
        """
        # 文件名处理
        if filename is None:
            filename = self.default_file
        
        # 验证文件名
        if not self._validate_filename(filename):
            raise ValueError(f"无效的文件名: {filename}")
        
        # 构建完整路径
        log_file = os.path.join(self.log_dir, filename)
        
        # 检查文件是否存在
        if not os.path.isfile(log_file):
            raise FileNotFoundError(f"日志文件不存在: {filename}")
        
        # 参数校验和默认值处理
        if lines is None:
            lines = self.default_lines

        lines = int(lines)
        if lines < 1:
            lines = 1
        if lines > self.max_lines:
            lines = self.max_lines

        # 使用 tail 命令读取日志文件末尾内容
        cmd = ["tail", "-n", str(lines), log_file]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=self.timeout_seconds,
            check=False,
        )

        if result.returncode != 0:
            logger.warning(
                "tail command failed: returncode=%s stderr=%s",
                result.returncode,
                (result.stderr or "").strip(),
            )

        # 直接返回原始内容，保持文件中的顺序
        return result.stdout or ""
