"""
子域名发现服务模块

提供基于 amass 和 subfinder 的子域名扫描功能
"""

import logging
import os
import subprocess
from datetime import datetime
from pathlib import Path
from typing import List, Dict

from apps.scan.utils.command_pool_executor import CommandPoolExecutor, CommandTask

logger = logging.getLogger(__name__)


class SubdomainDiscoveryService:
    """
    子域名发现服务类
    
    负责执行子域名扫描、结果合并、去重等功能
    """
    
    # ==================== 类常量 ====================
    
    # 扫描工具配置
    SCAN_TOOLS: List[Dict[str, str]] = [
        {
            'name': 'amass',
            'command': 'amass enum -passive -d {target} -o {output_file}'
        },
        {
            'name': 'subfinder',
            'command': 'subfinder -d {target} -o {output_file}'
        },
        {
            'name': 'echo',
            'command': 'echo {target}.com.cn > {output_file}'
        }
    ]
    
    # 默认配置
    DEFAULT_TIMEOUT: int = 3600  # 60分钟
    MODULE_DIR_NAME: str = "subdomain_discovery"
    FILE_BUFFER_SIZE: int = 1024 * 1024  # 1MB 缓冲区（优化大文件读写性能）
    
    # ==================== 初始化 ====================
    
    def __init__(self, timeout: int = None):
        """
        初始化子域名发现服务
        
        Args:
            timeout: 命令执行超时时间（秒），默认为 DEFAULT_TIMEOUT
        
        Note:
            使用全局命令池执行管理器进行并行执行
        """
        self.timeout = timeout or self.DEFAULT_TIMEOUT
        logger.debug("SubdomainDiscoveryService initialized with timeout=%d", self.timeout)
    
    # ==================== 公共方法 ====================
    
    def discover(self, target: str, base_dir: str) -> str:
        """
        执行子域名发现扫描，并将结果合并到单个文件
        
        Args:
            target: 目标域名（必填）
            base_dir: 扫描工作空间目录（必填）
                     - 由 initiate_scan_task 创建的工作空间目录
                     - 将在此目录下创建 subdomain_discovery/ 模块目录
        
        Returns:
            合并后的文件路径（绝对路径字符串）
        
        Raises:
            ValueError: 参数验证失败
            OSError: 文件系统操作失败
            RuntimeError: 扫描或合并失败
        
        目录结构示例：
            {SCAN_RESULTS_DIR}/                                  # 根目录（环境变量）
              └── scan_20251106_223626_dcf142ab/                 # base_dir（工作空间）
                  └── subdomain_discovery/                       # 模块目录
                      ├── amass_20251106_223626402066.txt       # amass 结果
                      ├── subfinder_20251106_223626402066.txt   # subfinder 结果
                      └── merged_20251106_223626402066.txt      # 合并结果
        
        Example:
            >>> service = SubdomainDiscoveryService()
            >>> result_file = service.discover(
            ...     'example.com', 
            ...     base_dir='/data/scans/scan_20251106_223626_dcf142ab'
            ... )
        """
        # 参数验证
        if not target or not isinstance(target, str):
            raise ValueError(f"Invalid target provided: {target}")
        
        if not base_dir:
            raise ValueError("base_dir is required (must be provided by initiate_scan_task)")
        
        # 生成唯一时间戳
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S%f')
        
        # 在工作空间下创建模块目录（让异常向上传播）
        scan_dir = self._create_scan_directory(base_dir)
        logger.info("子域名扫描目录已创建: %s", scan_dir)
        
        # 执行扫描
        result_files = self._execute_scan_tools(target, scan_dir, timestamp)
        
        if not result_files:
            raise RuntimeError(f"所有扫描工具均未产生结果 - 目标: {target}")
        
        # 合并结果
        merged_file = self._merge_results(scan_dir, result_files, timestamp)
        
        if not merged_file or not merged_file.exists():
            raise RuntimeError(f"结果合并失败或文件不存在 - 目标: {target}")
        
        logger.info("扫描完成 - 结果: %s", merged_file)
        return str(merged_file)
    
    def get_scan_results(self, merged_file: str) -> List[str]:
        """
        从合并文件中读取子域名列表（优化缓冲区）
        
        Args:
            merged_file: 合并文件路径
        
        Returns:
            子域名列表（可能为空，但不会因文件读取失败返回空列表）
        
        Raises:
            OSError: 文件读取失败
            UnicodeDecodeError: 文件编码错误
        
        Note:
            使用 1MB 缓冲区优化大文件读取性能
        """
        try:
            with open(merged_file, 'r', encoding='utf-8', buffering=self.FILE_BUFFER_SIZE) as f:
                results = [line.strip() for line in f if line.strip()]
                logger.info("从结果文件读取 %d 个子域名", len(results))
                return results
        except (OSError, UnicodeDecodeError) as e:
            logger.error("读取结果文件失败 %s: %s", merged_file, e)
            raise
    
    def count_subdomains(self, merged_file: str) -> int:
        """
        统计子域名数量
        
        Args:
            merged_file: 合并文件路径
        
        Returns:
            子域名数量
        """
        return self._count_lines(Path(merged_file))
    
    # ==================== 私有方法 ====================
    
    def _create_scan_directory(self, base_dir: str) -> Path:
        """
        在工作空间下创建模块目录
        
        Args:
            base_dir: 工作空间目录路径（由 initiate_scan_task 创建）
        
        Returns:
            创建的模块目录路径
        
        Raises:
            OSError: 目录创建失败或工作空间不可写
        
        Example:
            >>> scan_dir = self._create_scan_directory('/scan_results/scan_123_20241104_103000')
            >>> # 返回: /scan_results/scan_123_20241104_103000/subdomain_discovery/
        """
        base_path = Path(base_dir)
        
        # 验证工作空间目录是否存在
        if not base_path.exists():
            error_msg = f"工作空间目录不存在: {base_path}"
            logger.error(error_msg)
            raise OSError(error_msg)
        
        # 在工作空间下创建模块目录
        scan_dir = base_path / self.MODULE_DIR_NAME
        logger.debug("创建模块目录: %s", scan_dir)
        
        # 创建目录
        try:
            scan_dir.mkdir(parents=True, exist_ok=True)
            logger.debug("模块目录已创建: %s", scan_dir)
        except OSError as e:
            logger.error("创建目录失败 %s: %s", scan_dir, e)
            raise
        
        # 验证目录是否可写
        if not scan_dir.is_dir() or not os.access(scan_dir, os.W_OK):
            error_msg = f"目录 {scan_dir} 不可写"
            logger.error(error_msg)
            raise OSError(error_msg)
        
        return scan_dir
    
    def _execute_scan_tools(
        self, 
        target: str, 
        scan_dir: Path, 
        timestamp: str
    ) -> List[Path]:
        """
        并行执行所有配置的扫描工具
        
        Args:
            target: 目标域名
            scan_dir: 扫描输出目录
            timestamp: 时间戳字符串
        
        Returns:
            成功生成的结果文件路径列表（可能为空列表）
        
        Note:
            - 使用命令池并行执行所有工具，提升执行效率
            - 单个工具失败不会中断整个流程
        """
        total_tools = len(self.SCAN_TOOLS)
        logger.info("开始并行执行 %d 个扫描工具 - 目标: %s", total_tools, target)
        
        # 构建任务列表
        tasks = []
        for tool_config in self.SCAN_TOOLS:
            tool_name = tool_config['name']
            command_template = tool_config['command']
            
            # 为每个工具生成输出文件（使用时间戳）
            output_file = scan_dir / f"{tool_name}_{timestamp}.txt"
            
            # 构建命令
            command = command_template.replace('{target}', target).replace('{output_file}', str(output_file))
            
            # 创建任务
            task = CommandTask(
                name=tool_name,
                command=command,
                output_file=output_file,
                validate_output=True  # 验证输出文件
            )
            tasks.append(task)
        
        # 使用命令池并行执行
        command_pool = CommandPoolExecutor.get_instance()
        results = command_pool.execute_tasks(tasks)
        
        # 收集成功的结果文件
        result_files = []
        errors = []
        
        for result in results:
            if result.success and result.output_file:
                result_files.append(result.output_file)
            else:
                errors.append(f"{result.task.name}: {result.error}")
        
        # 汇总结果
        success_count = len(result_files)
        failure_count = len(errors)
        
        if success_count > 0:
            logger.info(
                "扫描完成 - 成功: %d/%d, 失败: %d/%d",
                success_count, total_tools, failure_count, total_tools
            )
            if errors:
                logger.warning("失败工具详情: %s", "; ".join(errors))
        else:
            logger.warning(
                "扫描完成但无结果 - 所有 %d 个工具均失败: %s",
                total_tools, "; ".join(errors)
            )
        
        return result_files
    
    def _merge_results(
        self, 
        scan_dir: Path, 
        result_files: List[Path], 
        timestamp: str
    ) -> Path:
        """
        流式合并所有扫描结果到单个文件，并去重排序
        
        使用临时文件和系统命令实现流式处理，内存占用小
        
        Args:
            scan_dir: 扫描目录
            result_files: 要合并的结果文件列表
            timestamp: 时间戳字符串
        
        Returns:
            合并后的文件路径
        
        Raises:
            ValueError: 没有文件需要合并
            OSError: 文件操作失败
            subprocess.SubprocessError: 排序去重命令执行失败
        """
        if not result_files:
            raise ValueError("没有结果文件可合并")
        
        merged_file = scan_dir / f"merged_{timestamp}.txt"
        temp_file = scan_dir / f"merged_{timestamp}.tmp"
        
        logger.info("开始合并 %d 个结果文件（流式处理）", len(result_files))
        
        # 步骤 1: 合并所有文件到临时文件（保留重复）
        # 使用缓冲区优化大文件读写性能
        total_lines = 0
        with open(temp_file, 'w', encoding='utf-8', buffering=self.FILE_BUFFER_SIZE) as out:
            for result_file in result_files:
                try:
                    with open(result_file, 'r', encoding='utf-8', buffering=self.FILE_BUFFER_SIZE) as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith('#'):  # 跳过空行和注释
                                out.write(f"{line}\n")
                                total_lines += 1
                    
                    logger.debug("Processed %s", result_file.name)
                
                except (OSError, UnicodeDecodeError) as e:
                    logger.error("Failed to read result file %s: %s", result_file, e)
                    continue
        
        if total_lines == 0:
            raise RuntimeError("结果文件中未找到任何子域名")
        
        logger.info("去重前总行数: %d", total_lines)
        
        # 步骤 2: 使用系统命令去重和排序（内存高效）
        self._sort_and_deduplicate(temp_file, merged_file)
        
        # 步骤 3: 验证并统计最终结果
        if not merged_file.exists():
            raise RuntimeError("合并文件未被创建")
        
        unique_count = self._count_lines(merged_file)
        if unique_count == 0:
            raise RuntimeError("合并文件为空，未找到有效子域名")
        
        logger.info("成功合并 %d 个唯一子域名到: %s", unique_count, merged_file.name)
        
        return merged_file
    
    def _sort_and_deduplicate(self, input_file: Path, output_file: Path) -> None:
        """
        使用系统命令对文件进行排序和去重
        
        Args:
            input_file: 输入文件路径
            output_file: 输出文件路径
        
        Raises:
            subprocess.CalledProcessError: 命令执行失败
        """
        try:
            # 使用 sort -u 命令：排序并去重
            # -u: unique，去重
            # 这是最高效的方式，系统底层优化
            subprocess.run(
                ['sort', '-u', str(input_file), '-o', str(output_file)],
                check=True,
                capture_output=True,
                encoding='utf-8'
            )
            logger.debug("Sorted and deduplicated: %s -> %s", input_file, output_file)
        
        except subprocess.CalledProcessError as e:
            logger.error("Sort command failed: %s", e.stderr if e.stderr else str(e))
            raise
    
    def _count_lines(self, file_path: Path) -> int:
        """
        快速统计文件行数（使用生成器 + 缓冲区优化）
        
        Args:
            file_path: 文件路径
        
        Returns:
            文件行数
        
        Note:
            使用生成器逐行处理，避免一次性加载整个文件到内存
        """
        try:
            with open(file_path, 'r', encoding='utf-8', buffering=self.FILE_BUFFER_SIZE) as f:
                return sum(1 for _ in f)
        except (OSError, UnicodeDecodeError) as e:
            logger.error("Failed to count lines in %s: %s", file_path, e)
            return 0
    

# ==================== 导出接口 ====================

__all__ = ['SubdomainDiscoveryService']

