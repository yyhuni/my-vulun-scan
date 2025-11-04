"""
子域名发现服务模块

提供基于 amass 和 subfinder 的子域名扫描功能
"""

import logging
import os
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict

from apps.common.command_executor import ScanCommandExecutor

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
            'command': 'subfinder -d {target} -o {output_file} -silent'
        }
    ]
    
    # 默认配置
    DEFAULT_TIMEOUT: int = 300  # 5分钟
    MODULE_DIR_NAME: str = "subdomain_discovery"
    
    # ==================== 初始化 ====================
    
    def __init__(self, timeout: Optional[int] = None):
        """
        初始化子域名发现服务
        
        Args:
            timeout: 命令执行超时时间（秒），默认为 DEFAULT_TIMEOUT
        """
        self.timeout = timeout or self.DEFAULT_TIMEOUT
        self.executor = ScanCommandExecutor(timeout=self.timeout)
        logger.debug("SubdomainDiscoveryService initialized with timeout=%d", self.timeout)
    
    # ==================== 公共方法 ====================
    
    def discover(self, target: str, base_dir: str) -> Optional[str]:
        """
        执行子域名发现扫描，并将结果合并到单个文件
        
        Args:
            target: 目标域名（必填）
            base_dir: 扫描工作空间目录（必填）
                     - 由 initiate_scan_task 创建的工作空间目录
                     - 将在此目录下创建 subdomain_discovery/ 模块目录
        
        Returns:
            合并后的文件路径（成功时）
            None（失败或无结果时）
        
        目录结构示例：
            {base_dir}/                           # 工作空间（由 initiate_scan_task 创建）
              └── subdomain_discovery/            # 模块目录
                  ├── amass_*.txt
                  ├── subfinder_*.txt
                  └── merged_*.txt
        
        Example:
            >>> service = SubdomainDiscoveryService()
            >>> result_file = service.discover(
            ...     'example.com', 
            ...     base_dir='/scan_results/scan_123_20241104_103000'
            ... )
        """
        # 参数验证
        if not target or not isinstance(target, str):
            logger.error("Invalid target provided: %s", target)
            return None
        
        if not base_dir:
            logger.error("base_dir is required (must be provided by initiate_scan_task)")
            return None
        
        # 生成唯一时间戳
        timestamp = self._generate_timestamp()
        
        # 在工作空间下创建模块目录
        try:
            scan_dir = self._create_scan_directory(base_dir)
            logger.info("子域名扫描目录已创建: %s", scan_dir)
        except OSError as e:
            logger.error("创建扫描目录失败: %s", e)
            return None
        
        # 执行扫描
        result_files = self._execute_scan_tools(target, scan_dir, timestamp)
        
        if not result_files:
            logger.warning("No scan results collected for target: %s", target)
            return None
        
        # 合并结果
        merged_file = self._merge_results(scan_dir, result_files, timestamp)
        
        if merged_file and merged_file.exists():
            logger.info("Scan completed successfully. Results: %s", merged_file)
            return str(merged_file)
        else:
            logger.warning("Merged file is empty or does not exist")
            return None
    
    def get_scan_results(self, merged_file: str) -> List[str]:
        """
        从合并文件中读取子域名列表
        
        Args:
            merged_file: 合并文件路径
        
        Returns:
            子域名列表
        """
        try:
            with open(merged_file, 'r', encoding='utf-8') as f:
                return [line.strip() for line in f if line.strip()]
        except (OSError, UnicodeDecodeError) as e:
            logger.error("Failed to read merged file %s: %s", merged_file, e)
            return []
    
    def count_subdomains(self, merged_file: str) -> int:
        """
        统计子域名数量
        
        Args:
            merged_file: 合并文件路径
        
        Returns:
            子域名数量
        """
        return len(self.get_scan_results(merged_file))
    
    # ==================== 私有方法 ====================
    
    def _generate_timestamp(self) -> str:
        """
        生成唯一时间戳
        
        格式: YYYYMMDD_HHMMSSffffff (年月日时分秒微秒)
        示例: 20251102_153045123456
        
        Returns:
            时间戳字符串
        """
        return datetime.now().strftime('%Y%m%d_%H%M%S%f')
    
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
        执行所有配置的扫描工具
        
        Args:
            target: 目标域名
            scan_dir: 扫描输出目录
            timestamp: 时间戳字符串
        
        Returns:
            成功生成的结果文件路径列表
        """
        result_files = []
        total_tools = len(self.SCAN_TOOLS)
        
        logger.info("Starting scan with %d tools for target: %s", total_tools, target)
        
        for idx, tool_config in enumerate(self.SCAN_TOOLS, 1):
            tool_name = tool_config['name']
            command_template = tool_config['command']
            
            # 为每个工具生成输出文件（使用时间戳）
            output_file = scan_dir / f"{tool_name}_{timestamp}.txt"
            
            try:
                command = command_template.format(
                    target=target,
                    output_file=str(output_file)
                )
                
                logger.info("[%d/%d] Executing %s", idx, total_tools, tool_name)
                self.executor.execute_scan_tool(tool_name, command)
                
                # 检查输出文件是否生成且非空
                if output_file.exists() and output_file.stat().st_size > 0:
                    result_files.append(output_file)
                    logger.info("[%d/%d] %s completed, output: %s", idx, total_tools, tool_name, output_file)
                else:
                    logger.warning("[%d/%d] %s completed but no results", idx, total_tools, tool_name)
            
            except subprocess.CalledProcessError:
                logger.warning("[%d/%d] %s failed, continuing with next tool", idx, total_tools, tool_name)
                continue
        
        logger.info("Scan completed: %d/%d tools produced results", len(result_files), total_tools)
        return result_files
    
    def _merge_results(
        self, 
        scan_dir: Path, 
        result_files: List[Path], 
        timestamp: str
    ) -> Optional[Path]:
        """
        流式合并所有扫描结果到单个文件，并去重排序
        
        使用临时文件和系统命令实现流式处理，内存占用小
        
        Args:
            scan_dir: 扫描目录
            result_files: 要合并的结果文件列表
            timestamp: 时间戳字符串
        
        Returns:
            合并后的文件路径，如果无结果则返回 None
        """
        if not result_files:
            logger.warning("No result files to merge")
            return None
        
        merged_file = scan_dir / f"merged_{timestamp}.txt"
        temp_file = scan_dir / f"merged_{timestamp}.tmp"
        
        logger.info("Merging %d result files (streaming mode)", len(result_files))
        
        try:
            # 步骤 1: 合并所有文件到临时文件（保留重复）
            total_lines = 0
            with open(temp_file, 'w', encoding='utf-8') as out:
                for result_file in result_files:
                    try:
                        with open(result_file, 'r', encoding='utf-8') as f:
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
                logger.warning("No subdomains found in result files")
                temp_file.unlink(missing_ok=True)
                return None
            
            logger.info("Total lines before deduplication: %d", total_lines)
            
            # 步骤 2: 使用系统命令去重和排序（内存高效）
            self._sort_and_deduplicate(temp_file, merged_file)
            
            # 步骤 3: 清理临时文件
            temp_file.unlink(missing_ok=True)
            
            # 步骤 4: 统计最终结果
            if merged_file.exists():
                unique_count = self._count_lines(merged_file)
                logger.info("Merged %d unique subdomains to: %s", unique_count, merged_file)
                
                # 步骤 5: 删除原始工具生成的文件
                self._cleanup_result_files(result_files)
                
                return merged_file
            else:
                logger.error("Merged file was not created")
                return None
        
        except (OSError, subprocess.SubprocessError) as e:
            logger.error("Failed to merge results: %s", e)
            # 清理临时文件
            temp_file.unlink(missing_ok=True)
            return None
    
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
        快速统计文件行数
        
        Args:
            file_path: 文件路径
        
        Returns:
            文件行数
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return sum(1 for _ in f)
        except (OSError, UnicodeDecodeError) as e:
            logger.error("Failed to count lines in %s: %s", file_path, e)
            return 0
    
    def _cleanup_result_files(self, result_files: List[Path]) -> None:
        """
        删除原始工具生成的结果文件
        
        Args:
            result_files: 要删除的文件路径列表
        """
        deleted_count = 0
        for result_file in result_files:
            try:
                if result_file.exists():
                    result_file.unlink()
                    deleted_count += 1
                    logger.debug("Deleted result file: %s", result_file)
            except OSError as e:
                logger.warning("Failed to delete result file %s: %s", result_file, e)
        
        logger.info("Cleaned up %d/%d result files", deleted_count, len(result_files))


# ==================== 导出接口 ====================

__all__ = ['SubdomainDiscoveryService']

