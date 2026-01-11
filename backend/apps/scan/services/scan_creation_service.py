"""
扫描创建服务

职责：
- 准备扫描参数
- 创建 Scan 记录
- 通过负载感知分发器在最优 Worker 上执行任务（支持本地和远程）
"""

import uuid
import logging
import threading
from typing import List, Tuple
from datetime import datetime
from pathlib import Path
from django.conf import settings
from django.db import transaction, connection
from django.db.utils import DatabaseError, IntegrityError, OperationalError
from django.core.exceptions import ValidationError, ObjectDoesNotExist

from apps.scan.models import Scan
from apps.scan.repositories import DjangoScanRepository
from apps.scan.utils.config_merger import merge_engine_configs, ConfigConflictError
from apps.targets.repositories import DjangoTargetRepository, DjangoOrganizationRepository
from apps.engine.repositories import DjangoEngineRepository
from apps.targets.models import Target
from apps.engine.models import ScanEngine
from apps.common.definitions import ScanStatus
from apps.engine.services.task_distributor import get_task_distributor

logger = logging.getLogger(__name__)


class ScanCreationService:
    """
    扫描创建服务
    
    职责：
    - 准备扫描参数
    - 创建 Scan 记录
    - 通过负载感知分发器在最优 Worker 上执行任务
    - 处理创建过程中的错误
    """
    
    def __init__(self):
        """
        初始化服务
        Note:
            移除了依赖注入，因为：
            1. 项目没有单元测试需求
            2. 不会更换数据库实现
            3. 所有调用都是直接实例化
            4. 减少不必要的复杂度
        """
        self.scan_repo = DjangoScanRepository()
        self.target_repo = DjangoTargetRepository()
        self.organization_repo = DjangoOrganizationRepository()
        self.engine_repo = DjangoEngineRepository()
    
    def prepare_initiate_scan(
        self,
        organization_id: int | None = None,
        target_id: int | None = None,
        engine_id: int | None = None
    ) -> tuple[List[Target], ScanEngine]:
        """
        准备扫描任务所需的数据
        
        职责：
            1. 参数验证（必填项、互斥参数）
            2. 资源查询（Engine、Organization、Target）
            3. 业务逻辑判断（组织下是否有目标）
            4. 返回准备好的目标列表和扫描引擎
        
        Args:
            organization_id: 组织ID（可选）
            target_id: 目标ID（可选）
            engine_id: 扫描引擎ID（必填）
        
        Returns:
            (目标列表, 扫描引擎对象) - 供 create_scans 方法使用
        
        Raises:
            ValidationError: 参数验证失败或业务规则不满足
            ObjectDoesNotExist: 资源不存在（Organization/Target/ScanEngine）
        
        Note:
            - organization_id 和 target_id 必须二选一
            - 如果提供 organization_id，返回该组织下所有目标
            - 如果提供 target_id，返回单个目标列表
        """
        # 1. 参数验证
        if not engine_id:
            raise ValidationError('缺少必填参数: engine_id')
        
        if not organization_id and not target_id:
            raise ValidationError('必须提供 organization_id 或 target_id 其中之一')
        
        if organization_id and target_id:
            raise ValidationError('organization_id 和 target_id 只能提供其中之一')
        
        # 2. 查询扫描引擎（通过 Repository 层）
        engine = self.engine_repo.get_by_id(engine_id)
        if not engine:
            logger.error("扫描引擎不存在 - Engine ID: %s", engine_id)
            raise ObjectDoesNotExist(f'ScanEngine ID {engine_id} 不存在')
        
        # 3. 根据参数获取目标列表
        targets = []
        
        if organization_id:
            # 根据组织ID获取所有目标（通过 Repository 层）
            organization = self.organization_repo.get_by_id(organization_id)
            if not organization:
                logger.error("组织不存在 - Organization ID: %s", organization_id)
                raise ObjectDoesNotExist(f'Organization ID {organization_id} 不存在')
            
            targets = self.organization_repo.get_targets(organization_id)
            
            if not targets:
                raise ValidationError(f'组织 ID {organization_id} 下没有目标')
            
            logger.debug(
                "准备发起扫描 - 组织: %s, 目标数量: %d, 引擎: %s",
                organization.name,
                len(targets),
                engine.name
            )
        else:
            # 根据目标ID获取单个目标（通过 Repository 层）
            target = self.target_repo.get_by_id(target_id)
            if not target:
                logger.error("目标不存在 - Target ID: %s", target_id)
                raise ObjectDoesNotExist(f'Target ID {target_id} 不存在')
            
            targets = [target]
            
            logger.debug(
                "准备发起扫描 - 目标: %s, 引擎: %s",
                target.name,
                engine.name
            )
        
        return targets, engine
    
    def prepare_initiate_scan_multi_engine(
        self,
        organization_id: int | None = None,
        target_id: int | None = None,
        engine_ids: List[int] | None = None
    ) -> Tuple[List[Target], str, List[str], List[int]]:
        """
        准备多引擎扫描任务所需的数据
        
        职责：
            1. 参数验证（必填项、互斥参数）
            2. 资源查询（Engines、Organization、Target）
            3. 合并引擎配置（检测冲突）
            4. 返回准备好的目标列表、合并配置和引擎信息
        
        Args:
            organization_id: 组织ID（可选）
            target_id: 目标ID（可选）
            engine_ids: 扫描引擎ID列表（必填）
        
        Returns:
            (目标列表, 合并配置, 引擎名称列表, 引擎ID列表) - 供 create_scans 方法使用
        
        Raises:
            ValidationError: 参数验证失败或业务规则不满足
            ObjectDoesNotExist: 资源不存在（Organization/Target/ScanEngine）
            ConfigConflictError: 引擎配置存在冲突
        
        Note:
            - organization_id 和 target_id 必须二选一
            - 如果提供 organization_id，返回该组织下所有目标
            - 如果提供 target_id，返回单个目标列表
        """
        # 1. 参数验证
        if not engine_ids:
            raise ValidationError('缺少必填参数: engine_ids')
        
        if not organization_id and not target_id:
            raise ValidationError('必须提供 organization_id 或 target_id 其中之一')
        
        if organization_id and target_id:
            raise ValidationError('organization_id 和 target_id 只能提供其中之一')
        
        # 2. 查询所有扫描引擎
        engines = []
        for engine_id in engine_ids:
            engine = self.engine_repo.get_by_id(engine_id)
            if not engine:
                logger.error("扫描引擎不存在 - Engine ID: %s", engine_id)
                raise ObjectDoesNotExist(f'ScanEngine ID {engine_id} 不存在')
            engines.append(engine)
        
        # 3. 合并引擎配置（可能抛出 ConfigConflictError）
        engine_configs = [(e.name, e.configuration or '') for e in engines]
        merged_configuration = merge_engine_configs(engine_configs)
        engine_names = [e.name for e in engines]
        
        logger.debug(
            "引擎配置合并成功 - 引擎: %s",
            ', '.join(engine_names)
        )
        
        # 4. 根据参数获取目标列表
        targets = []
        
        if organization_id:
            # 根据组织ID获取所有目标
            organization = self.organization_repo.get_by_id(organization_id)
            if not organization:
                logger.error("组织不存在 - Organization ID: %s", organization_id)
                raise ObjectDoesNotExist(f'Organization ID {organization_id} 不存在')
            
            targets = self.organization_repo.get_targets(organization_id)
            
            if not targets:
                raise ValidationError(f'组织 ID {organization_id} 下没有目标')
            
            logger.debug(
                "准备发起扫描 - 组织: %s, 目标数量: %d, 引擎: %s",
                organization.name,
                len(targets),
                ', '.join(engine_names)
            )
        else:
            # 根据目标ID获取单个目标
            target = self.target_repo.get_by_id(target_id)
            if not target:
                logger.error("目标不存在 - Target ID: %s", target_id)
                raise ObjectDoesNotExist(f'Target ID {target_id} 不存在')
            
            targets = [target]
            
            logger.debug(
                "准备发起扫描 - 目标: %s, 引擎: %s",
                target.name,
                ', '.join(engine_names)
            )
        
        return targets, merged_configuration, engine_names, engine_ids
    
    def _generate_scan_workspace_dir(self) -> str:
        """
        生成 Scan 工作空间目录路径
        
        职责：
        - 生成唯一的 Scan 级别工作空间目录路径字符串
        - 不创建实际目录（由 Flow 层负责）
        
        Returns:
            Scan 工作空间目录路径字符串
        
        格式：{SCAN_RESULTS_DIR}/scan_{timestamp}_{uuid8}/
        示例：/data/scans/scan_20231104_152030_a3f2b7e9/
        
        Raises:
            ValueError: 如果 SCAN_RESULTS_DIR 未设置或为空
        
        Note:
            使用秒级时间戳 + 8 位 UUID 确保路径唯一性
            冲突概率：同一秒内创建 1000 个扫描，冲突概率 < 0.01%
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = uuid.uuid4().hex[:8]  # 8 位十六进制UUID (4,294,967,296 种可能)
        
        # 从 settings 获取，保持配置统一
        base_dir = getattr(settings, 'SCAN_RESULTS_DIR', None)
        if not base_dir:
            error_msg = "SCAN_RESULTS_DIR 未设置，无法创建扫描工作空间"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        scan_workspace_dir = str(Path(base_dir) / f"scan_{timestamp}_{unique_id}")
        return scan_workspace_dir
    
    def create_scans(
        self,
        targets: List[Target],
        engine_ids: List[int],
        engine_names: List[str],
        yaml_configuration: str,
        scheduled_scan_name: str | None = None,
        scan_mode: str = 'full'
    ) -> List[Scan]:
        """
        为多个目标批量创建扫描任务，后台异步分发到 Worker
        
        Args:
            targets: 目标列表
            engine_ids: 引擎 ID 列表
            engine_names: 引擎名称列表
            yaml_configuration: YAML 格式的扫描配置
            scheduled_scan_name: 定时扫描任务名称（可选，用于通知显示）
            scan_mode: 扫描模式，'full' 或 'quick'（默认 'full'）
        
        Returns:
            创建的 Scan 对象列表（立即返回，不等待分发完成）
        
        流程：
            1. 同步：批量创建 Scan 记录（快速）
            2. 异步：后台线程通过 TaskDistributor 分发任务到 Workers
        """
        # 第一步：准备批量创建的数据
        scans_to_create = []
        
        for target in targets:
            try:
                scan_workspace_dir = self._generate_scan_workspace_dir()
                scan = Scan(
                    target=target,
                    engine_ids=engine_ids,
                    engine_names=engine_names,
                    yaml_configuration=yaml_configuration,
                    results_dir=scan_workspace_dir,
                    status=ScanStatus.INITIATED,
                    container_ids=[],
                    scan_mode=scan_mode,
                )
                scans_to_create.append(scan)
            except (ValidationError, ValueError) as e:
                logger.error(
                    "准备扫描任务数据失败 - Target: %s, 错误: %s",
                    target.name, e
                )
                continue
        
        if not scans_to_create:
            logger.warning("没有需要创建的扫描任务")
            return []
        
        # 第二步：使用事务批量创建（同步，快速）
        created_scans = []
        try:
            with transaction.atomic():
                created_scans = self.scan_repo.bulk_create(scans_to_create)
                logger.info("批量创建扫描记录成功 - 数量: %d", len(created_scans))
        except (DatabaseError, IntegrityError) as e:
            logger.exception("数据库错误：批量创建扫描记录失败 - 错误: %s", e)
            return []
        except ValidationError as e:
            logger.error("验证错误：扫描任务数据无效 - 错误: %s", e)
            return []
        
        # 第三步：分发任务到 Workers
        # 使用第一个引擎名称作为显示名称，或者合并显示
        display_engine_name = ', '.join(engine_names) if engine_names else ''
        scan_data = [
            {
                'scan_id': scan.id,
                'target_name': scan.target.name,
                'target_id': scan.target.id,
                'results_dir': scan.results_dir,
                'engine_name': display_engine_name,
                'scheduled_scan_name': scheduled_scan_name,
            }
            for scan in created_scans
        ]
        
        # 后台线程异步分发（不阻塞 API/调度器）
        thread = threading.Thread(
            target=self._distribute_scans_to_workers,
            args=(scan_data,),
            daemon=True,
        )
        thread.start()
        logger.info("扫描任务已创建，后台分发中 - 数量: %d", len(created_scans))
        
        return created_scans
    
    def _distribute_scans_to_workers(self, scan_data: List[dict]):
        """
        后台线程：分发扫描任务到 Workers
        
        Args:
            scan_data: 扫描任务数据列表
        """
        logger.info("="*60)
        logger.info("开始分发扫描任务到 Workers - 数量: %d", len(scan_data))
        logger.info("="*60)
        
        # 后台线程需要新的数据库连接
        connection.close()
        logger.info("已关闭旧数据库连接，准备获取新连接")
        
        distributor = get_task_distributor()
        logger.info("TaskDistributor 初始化完成")
        
        scan_repo = DjangoScanRepository()
        logger.info("ScanRepository 初始化完成")
        
        for data in scan_data:
            scan_id = data['scan_id']
            logger.info("-"*40)
            logger.info("准备分发扫描任务 - Scan ID: %s, Target ID: %s", scan_id, data['target_id'])
            try:
                logger.info("调用 distributor.execute_scan_flow...")
                success, message, container_id, worker_id = distributor.execute_scan_flow(
                    scan_id=scan_id,
                    target_id=data['target_id'],
                    target_name=data['target_name'],
                    scan_workspace_dir=data['results_dir'],
                    engine_name=data['engine_name'],
                    scheduled_scan_name=data.get('scheduled_scan_name'),
                )
                
                logger.info(
                    "execute_scan_flow 返回 - success: %s, message: %s, container_id: %s, worker_id: %s",
                    success, message, container_id, worker_id
                )
                
                if success:
                    if container_id:
                        scan_repo.append_container_id(scan_id, container_id)
                        logger.info("已记录 container_id: %s", container_id)
                    if worker_id:
                        scan_repo.update_worker(scan_id, worker_id)
                        logger.info("已记录 worker_id: %s", worker_id)
                    logger.info(
                        "✓ 扫描任务已提交 - Scan ID: %s, Worker: %s",
                        scan_id, worker_id
                    )
                else:
                    logger.error("execute_scan_flow 返回失败 - message: %s", message)
                    raise Exception(message)
                    
            except Exception as e:
                logger.error("提交扫描任务失败 - Scan ID: %s, 错误: %s", scan_id, e)
                logger.exception("详细堆栈:")
                try:
                    scan_repo.update_status(
                        scan_id,
                        ScanStatus.FAILED,
                        error_message=f'提交任务失败: {e}',
                    )
                except (DatabaseError, OperationalError) as save_error:
                    logger.error("更新状态失败 - Scan ID: %s, 错误: %s", scan_id, save_error)


# 导出接口
__all__ = ['ScanCreationService']
