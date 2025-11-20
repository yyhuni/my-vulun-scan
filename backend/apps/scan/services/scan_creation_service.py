"""
扫描创建服务

职责：
- 准备扫描参数
- 创建 Scan 记录
- 提交 Prefect Flow Run
"""

import uuid
import logging
from typing import List
from datetime import datetime
from pathlib import Path
from django.conf import settings
from django.db import transaction
from django.db.utils import DatabaseError, IntegrityError, OperationalError
from django.core.exceptions import ValidationError, ObjectDoesNotExist

from apps.scan.models import Scan
from apps.scan.repositories import DjangoScanRepository
from apps.targets.repositories import DjangoTargetRepository, DjangoOrganizationRepository
from apps.engine.repositories import DjangoEngineRepository
from apps.targets.models import Target
from apps.engine.models import ScanEngine
from apps.common.definitions import ScanStatus

logger = logging.getLogger(__name__)


# 导入顶层函数
from apps.scan.services.scan_service import _submit_flow_deployment


class ScanCreationService:
    """
    扫描创建服务
    
    职责：
    - 准备扫描参数
    - 创建 Scan 记录
    - 提交 Prefect Flow Run
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
        engine: ScanEngine
    ) -> List[Scan]:
        """
        为多个目标批量创建扫描任务并通过 Prefect 3.x 异步启动
        
        Args:
            targets: 目标列表
            engine: 扫描引擎对象
        
        Returns:
            创建的 Scan 对象列表
        
        性能优化：
            1. 使用 bulk_create 批量插入数据库（避免 N+1 问题）
            2. 使用事务保护批量操作（确保原子性）
            3. 使用 Prefect 3.x Client API 异步提交任务（不阻塞请求）
        
        Note:
            - 任务通过 Prefect Deployment 提交到 Server
            - Worker 异步执行，不阻塞 HTTP 请求
            - Flow 状态由 Prefect Handlers 自动管理
        """
        # 第一步：准备批量创建的数据
        scans_to_create = []
        
        for target in targets:
            try:
                # 生成 Scan 工作空间目录路径
                scan_workspace_dir = self._generate_scan_workspace_dir()
                scan = Scan(
                    target=target,
                    engine=engine,
                    results_dir=scan_workspace_dir,  # 保存到数据库字段
                    status=ScanStatus.INITIATED,  # 显式设置初始状态
                    flow_run_ids=[],  # 显式初始化为空列表
                    flow_run_names=[],  # 显式初始化为空列表
                )
                scans_to_create.append(scan)
            except (ValidationError, ValueError) as e:
                logger.error(
                    "准备扫描任务数据失败（验证错误） - Target: %s, Engine: %s, 错误: %s",
                    target.name,
                    engine.name,
                    e
                )
                # 继续处理其他目标，不中断批量操作
                continue
        
        if not scans_to_create:
            logger.warning("没有需要创建的扫描任务")
            return []
        
        # 第二步：使用事务批量创建（一次数据库操作）
        created_scans = []
        try:
            with transaction.atomic():
                created_scans = self.scan_repo.bulk_create(scans_to_create)
                logger.info(
                    "批量创建扫描任务记录成功 - 数量: %d",
                    len(created_scans)
                )
        except (DatabaseError, IntegrityError) as e:
            logger.exception(
                "数据库错误：批量创建扫描任务记录失败 - 错误: %s",
                e
            )
            return []
        except ValidationError as e:
            logger.error(
                "验证错误：扫描任务数据无效 - 错误: %s",
                e
            )
            return []
        
        # 第三步：通过 Prefect 3.x 异步提交扫描任务
        successful_scans = []
        failed_count = 0
        
        for scan in created_scans:
            try:
                # 准备 Flow 参数（Service 层负责数据准备）
                flow_kwargs = {
                    'scan_id': scan.id,
                    'target_name': scan.target.name,
                    'target_id': scan.target.id,
                    'scan_workspace_dir': scan.results_dir,  # Scan 工作空间目录
                    'engine_name': scan.engine.name,
                    'engine_config': scan.engine.configuration
                }
                
                # 使用 Prefect 3.x Client API 异步提交
                # 直接使用 Prefect Client 提交任务到 Server
                # 任务由 Worker 异步执行，不阻塞 HTTP 请求
                flow_run_id = _submit_flow_deployment(
                    deployment_name="initiate_scan/initiate-scan-on-demand",
                    parameters=flow_kwargs
                )
                
                # 保存 flow_run_id 到数据库，供后续停止操作使用（使用仓储层以保证并发安全）
                if self.scan_repo.append_flow_run_id(scan.id, flow_run_id):
                    current_flow_ids = list(scan.flow_run_ids or [])
                    current_flow_ids.append(flow_run_id)
                    scan.flow_run_ids = current_flow_ids
                else:
                    logger.warning(
                        "追加 Flow Run ID 失败 - Scan ID: %s, Flow Run ID: %s",
                        scan.id,
                        flow_run_id
                    )
                
                successful_scans.append(scan)
                logger.info(
                    "✓ 异步提交扫描任务成功 - Scan ID: %s, Flow Run ID: %s",
                    scan.id,
                    flow_run_id
                )
            except Exception as e:
                failed_count += 1
                logger.error(
                    "Prefect 错误：提交扫描任务失败 - Scan ID: %s, 错误: %s",
                    scan.id,
                    e
                )
                # 标记为失败状态
                try:
                    self.scan_repo.update_status(
                        scan.id,
                        ScanStatus.FAILED,
                        error_message='提交 Prefect 任务失败，请检查 Prefect Server 状态',
                    )
                except (DatabaseError, OperationalError) as save_error:
                    logger.error(
                        "数据库错误：更新扫描任务状态失败 - Scan ID: %s, 错误: %s",
                        scan.id,
                        save_error
                    )
        
        logger.info(
            "批量创建扫描任务完成 - 总数: %d, 成功: %d, 失败: %d",
            len(targets),
            len(successful_scans),
            failed_count
        )
        
        return successful_scans


# 导出接口
__all__ = ['ScanCreationService']
