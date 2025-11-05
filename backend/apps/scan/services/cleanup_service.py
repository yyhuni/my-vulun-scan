"""
资源清理服务

负责清理扫描任务产生的临时文件和目录
"""

import logging
import shutil
from pathlib import Path
from typing import Optional

from apps.scan.repositories import ScanRepository

logger = logging.getLogger(__name__)


class CleanupService:
    """资源清理服务"""
    
    def __init__(self, scan_repository: Optional[ScanRepository] = None):
        """
        初始化服务
        
        Args:
            scan_repository: ScanRepository 实例（用于依赖注入）
        """
        self.scan_repo = scan_repository or ScanRepository()
    
    def cleanup_directory(self, directory_path: str) -> bool:
        """
        清理目录及其所有内容
        
        Args:
            directory_path: 目录路径
        
        Returns:
            是否清理成功
        """
        if not directory_path:
            logger.debug("目录路径为空，跳过清理")
            return False
        
        try:
            dir_path = Path(directory_path)
            
            # 安全检查：确保目录存在且是目录
            if not dir_path.exists():
                logger.debug("目录不存在，无需清理: %s", directory_path)
                return True
            
            if not dir_path.is_dir():
                logger.warning("路径不是目录: %s", directory_path)
                return False
            
            # 安全检查：防止删除系统关键目录
            critical_paths = ['/', '/home', '/root', '/etc', '/usr', '/var', '/tmp']
            resolved_path = str(dir_path.resolve())
            if resolved_path in critical_paths or resolved_path.startswith('/sys'):
                logger.error("拒绝删除系统关键目录: %s", resolved_path)
                return False
            
            # 删除目录及其所有内容
            shutil.rmtree(dir_path)
            logger.info("成功清理目录: %s", directory_path)
            return True
            
        except PermissionError as e:
            logger.error("权限不足，无法删除目录 %s: %s", directory_path, e)
            return False
        except OSError as e:
            logger.error("删除目录失败 %s: %s", directory_path, e)
            return False
        except Exception as e:  # noqa: BLE001
            logger.exception("清理目录时发生未知错误 %s: %s", directory_path, e)
            return False
    
    def cleanup_file(self, file_path: str) -> bool:
        """
        清理单个文件
        
        Args:
            file_path: 文件路径
        
        Returns:
            是否清理成功
        """
        if not file_path:
            logger.debug("文件路径为空，跳过清理")
            return False
        
        try:
            path = Path(file_path)
            
            # 安全检查：确保文件存在且是文件
            if not path.exists():
                logger.debug("文件不存在，无需清理: %s", file_path)
                return True
            
            if not path.is_file():
                logger.warning("路径不是文件: %s", file_path)
                return False
            
            # 删除文件
            path.unlink()
            logger.info("成功清理文件: %s", file_path)
            return True
            
        except PermissionError as e:
            logger.error("权限不足，无法删除文件 %s: %s", file_path, e)
            return False
        except OSError as e:
            logger.error("删除文件失败 %s: %s", file_path, e)
            return False
        except Exception as e:  # noqa: BLE001
            logger.exception("清理文件时发生未知错误 %s: %s", file_path, e)
            return False
    
    def cleanup_results_directory(self, results_dir: Optional[str]) -> bool:
        """
        清理扫描结果目录（便捷方法）
        
        Args:
            results_dir: 结果目录路径
        
        Returns:
            是否清理成功
        """
        if not results_dir:
            logger.debug("结果目录为空，跳过清理")
            return False
        
        logger.info("开始清理扫描结果目录: %s", results_dir)
        return self.cleanup_directory(results_dir)
    
    def cleanup_scan_task_temp_files(self, scan_id: int) -> bool:
        """
        清理扫描任务的临时文件
        
        职责：
        - 通过 scan_id 获取工作空间路径
        - 执行清理操作（当前策略：只记录日志，不实际清理）
        - 具体清理由各个任务服务在执行过程中完成
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            是否处理成功
        """
        try:
            # 获取 Scan 对象（不需要预加载关联对象）
            scan = self.scan_repo.get_by_id(scan_id, prefetch_relations=False)
            
            if not scan:
                logger.warning("Scan %s 不存在，跳过清理", scan_id)
                return False
            
            workspace_dir = scan.results_dir
            
            if not workspace_dir:
                logger.warning("Scan %s 没有 results_dir，跳过清理", scan_id)
                return False
            
            # 当前策略：任务级临时文件已在执行过程中清理
            # 例如：subdomain_discovery 已经在内部清理了 amass/subfinder 的原始文件
            logger.info("✓ Scan %s 的临时文件已在任务执行过程中清理", scan_id)
            return True
            
        except Exception as e:  # noqa: BLE001
            logger.error("清理 Scan %s 临时文件失败 - 错误: %s", scan_id, e)
            return False

