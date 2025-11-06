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

from apps.scan.utils.command_executor import ScanCommandExecutor

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
    
    def __init__(self, timeout: int = None):
        """
        初始化子域名发现服务
        
        Args:
            timeout: 命令执行超时时间（秒），默认为 DEFAULT_TIMEOUT
        """
        self.timeout = timeout or self.DEFAULT_TIMEOUT
        self.executor = ScanCommandExecutor(timeout=self.timeout)
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
            raise ValueError(f"Invalid target provided: {target}")
        
        if not base_dir:
            raise ValueError("base_dir is required (must be provided by initiate_scan_task)")
        
        # 生成唯一时间戳
        timestamp = self._generate_timestamp()
        
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
        从合并文件中读取子域名列表
        
        Args:
            merged_file: 合并文件路径
        
        Returns:
            子域名列表（可能为空，但不会因文件读取失败返回空列表）
        
        Raises:
            OSError: 文件读取失败
            UnicodeDecodeError: 文件编码错误
        """
        try:
            with open(merged_file, 'r', encoding='utf-8') as f:
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
            成功生成的结果文件路径列表（可能为空列表）
        
        Note:
            单个工具失败不会中断整个流程，会继续执行其他工具
        """
        result_files = []
        total_tools = len(self.SCAN_TOOLS)
        errors = []
        
        logger.info("开始执行 %d 个扫描工具 - 目标: %s", total_tools, target)
        
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
                
                logger.info("[%d/%d] 执行扫描工具: %s", idx, total_tools, tool_name)
                self.executor.execute_scan_tool(tool_name, command)
                
                # 检查输出文件是否生成且非空
                if output_file.exists() and output_file.stat().st_size > 0:
                    result_files.append(output_file)
                    file_size = output_file.stat().st_size
                    logger.info(
                        "[%d/%d] %s 完成 - 文件: %s (大小: %d 字节)",
                        idx, total_tools, tool_name, output_file.name, file_size
                    )
                else:
                    error_msg = f"{tool_name}: 未生成结果或文件为空"
                    logger.warning("[%d/%d] %s", idx, total_tools, error_msg)
                    errors.append(error_msg)
            
            except subprocess.CalledProcessError as e:
                error_msg = f"{tool_name} 失败 (退出码 {e.returncode})"
                logger.warning("[%d/%d] %s, 继续执行下一个工具", idx, total_tools, error_msg)
                errors.append(error_msg)
                continue
            
            except subprocess.TimeoutExpired:
                error_msg = f"{tool_name} 超时 ({self.timeout}秒)"
                logger.warning("[%d/%d] %s, 继续执行下一个工具", idx, total_tools, error_msg)
                errors.append(error_msg)
                continue
            
            except (OSError, IOError) as e:
                error_msg = f"{tool_name} 文件系统错误: {type(e).__name__}: {e}"
                logger.error("[%d/%d] %s, 继续执行下一个工具", idx, total_tools, error_msg)
                errors.append(error_msg)
                continue
            
            except Exception as e:
                error_msg = f"{tool_name} 未预期错误: {type(e).__name__}: {e}"
                logger.error("[%d/%d] %s, 继续执行下一个工具", idx, total_tools, error_msg)
                errors.append(error_msg)
                continue
        
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
                temp_file.unlink(missing_ok=True)
                raise RuntimeError("结果文件中未找到任何子域名")
            
            logger.info("去重前总行数: %d", total_lines)
            
            # 步骤 2: 使用系统命令去重和排序（内存高效）
            self._sort_and_deduplicate(temp_file, merged_file)
            
            # 步骤 3: 清理临时文件
            temp_file.unlink(missing_ok=True)
            
            # 步骤 4: 验证并统计最终结果
            if not merged_file.exists():
                raise RuntimeError("合并文件未被创建")
            
            unique_count = self._count_lines(merged_file)
            if unique_count == 0:
                raise RuntimeError("合并文件为空，未找到有效子域名")
            
            logger.info("成功合并 %d 个唯一子域名到: %s", unique_count, merged_file.name)
            
            # 步骤 5: 删除原始工具生成的文件
            self._cleanup_result_files(result_files)
            
            return merged_file
        
        except (OSError, IOError) as e:
            # 文件操作失败
            logger.error("文件操作失败: %s", e)
            temp_file.unlink(missing_ok=True)
            raise
        
        except subprocess.SubprocessError as e:
            # 排序去重命令失败
            logger.error("排序去重失败: %s", e)
            temp_file.unlink(missing_ok=True)
            raise
        
        except Exception as e:
            # 其他未预期错误
            logger.error("合并结果时发生未预期错误: %s", e)
            temp_file.unlink(missing_ok=True)
            raise
    
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

