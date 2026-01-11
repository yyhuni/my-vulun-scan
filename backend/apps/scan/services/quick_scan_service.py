"""
快速扫描服务

负责解析用户输入（URL、域名、IP、CIDR）并创建对应的资产数据
"""

import logging
from dataclasses import dataclass, field
from typing import Optional, Literal, List, Dict, Any
from urllib.parse import urlparse

from django.db import transaction

from apps.common.validators import (
    validate_url, detect_input_type, validate_domain,
    validate_ip, validate_cidr, is_valid_ip
)
from apps.targets.services.target_service import TargetService
from apps.targets.models import Target
from apps.asset.dtos import WebSiteDTO
from apps.asset.dtos.asset import EndpointDTO
from apps.asset.repositories.asset.website_repository import DjangoWebSiteRepository
from apps.asset.repositories.asset.endpoint_repository import DjangoEndpointRepository

logger = logging.getLogger(__name__)


@dataclass
class ParsedInputDTO:
    """解析输入 DTO，只在快速扫描流程中使用"""
    original_input: str
    input_type: Literal['url', 'domain', 'ip', 'cidr']
    target_name: str
    target_type: Literal['domain', 'ip', 'cidr']
    website_url: Optional[str] = None
    endpoint_url: Optional[str] = None
    line_number: Optional[int] = None
    # 验证状态放在嵌套结构中，减少顶层属性数量
    validation: Dict[str, Any] = field(default_factory=lambda: {
        'is_valid': True,
        'error': None
    })

    @property
    def is_valid(self) -> bool:
        return self.validation.get('is_valid', True)

    @property
    def error(self) -> Optional[str]:
        return self.validation.get('error')


class QuickScanService:
    """快速扫描服务 - 解析输入并创建资产"""

    def __init__(self):
        self.target_service = TargetService()
        self.website_repo = DjangoWebSiteRepository()
        self.endpoint_repo = DjangoEndpointRepository()

    def parse_inputs(self, inputs: List[str]) -> List[ParsedInputDTO]:
        """解析多行输入，返回解析结果列表（跳过空行）"""
        results = []
        for line_number, input_str in enumerate(inputs, start=1):
            input_str = input_str.strip()
            if not input_str:
                continue

            try:
                input_type = detect_input_type(input_str)
                if input_type == 'url':
                    dto = self._parse_url_input(input_str, line_number)
                else:
                    dto = self._parse_target_input(input_str, input_type, line_number)
                results.append(dto)
            except ValueError as e:
                results.append(ParsedInputDTO(
                    original_input=input_str,
                    input_type='domain',
                    target_name=input_str,
                    target_type='domain',
                    line_number=line_number,
                    validation={'is_valid': False, 'error': str(e)}
                ))
        return results

    def _parse_url_input(self, url_str: str, line_number: int) -> ParsedInputDTO:
        """解析 URL 输入"""
        validate_url(url_str)
        parsed = urlparse(url_str)
        host = parsed.hostname
        has_path = parsed.path and parsed.path != '/'
        root_url = f"{parsed.scheme}://{parsed.netloc}"
        target_type = 'ip' if is_valid_ip(host) else 'domain'

        return ParsedInputDTO(
            original_input=url_str,
            input_type='url',
            target_name=host,
            target_type=target_type,
            website_url=root_url,
            endpoint_url=url_str if has_path else None,
            line_number=line_number
        )

    def _parse_target_input(
        self,
        input_str: str,
        input_type: str,
        line_number: int
    ) -> ParsedInputDTO:
        """解析非 URL 输入（domain/ip/cidr）"""
        validators = {
            'domain': (validate_domain, 'domain'),
            'ip': (validate_ip, 'ip'),
            'cidr': (validate_cidr, 'cidr'),
        }

        if input_type not in validators:
            raise ValueError(f"未知的输入类型: {input_type}")

        validator, target_type = validators[input_type]
        validator(input_str)

        return ParsedInputDTO(
            original_input=input_str,
            input_type=input_type,
            target_name=input_str,
            target_type=target_type,
            line_number=line_number
        )

    @transaction.atomic
    def process_quick_scan(self, inputs: List[str]) -> Dict[str, Any]:
        """处理快速扫描请求"""
        parsed_inputs = self.parse_inputs(inputs)
        valid_inputs = [p for p in parsed_inputs if p.is_valid]
        invalid_inputs = [p for p in parsed_inputs if not p.is_valid]

        errors = [
            {'line_number': p.line_number, 'input': p.original_input, 'error': p.error}
            for p in invalid_inputs
        ]

        if not valid_inputs:
            return {
                'targets': [],
                'target_stats': {'created': 0, 'reused': 0, 'failed': len(invalid_inputs)},
                'asset_stats': {'websites_created': 0, 'endpoints_created': 0},
                'errors': errors
            }

        asset_result = self.create_assets_from_parsed_inputs(valid_inputs)

        # 构建 target_name → inputs 映射
        target_inputs_map: Dict[str, List[str]] = {}
        for p in valid_inputs:
            target_inputs_map.setdefault(p.target_name, []).append(p.original_input)

        return {
            'targets': asset_result['targets'],
            'target_stats': asset_result['target_stats'],
            'asset_stats': asset_result['asset_stats'],
            'target_inputs_map': target_inputs_map,
            'errors': errors
        }

    def create_assets_from_parsed_inputs(
        self,
        parsed_inputs: List[ParsedInputDTO]
    ) -> Dict[str, Any]:
        """从解析结果创建资产（只包含有效输入）"""
        # 1. 收集并去重 target 数据
        targets_data = {
            dto.target_name: {'name': dto.target_name, 'type': dto.target_type}
            for dto in parsed_inputs
        }
        targets_list = list(targets_data.values())

        # 2. 批量创建 Target
        target_result = self.target_service.batch_create_targets(targets_list)

        # 3. 建立 name → id 映射
        target_names = [d['name'] for d in targets_list]
        targets = Target.objects.filter(name__in=target_names)
        target_id_map = {t.name: t.id for t in targets}

        # 4. 批量创建 Website 和 Endpoint
        websites_created = self._bulk_create_websites(parsed_inputs, target_id_map)
        endpoints_created = self._bulk_create_endpoints(parsed_inputs, target_id_map)

        return {
            'targets': list(targets),
            'target_stats': {
                'created': target_result['created_count'],
                'reused': 0,
                'failed': target_result['failed_count']
            },
            'asset_stats': {
                'websites_created': websites_created,
                'endpoints_created': endpoints_created
            }
        }

    def _bulk_create_websites(
        self,
        parsed_inputs: List[ParsedInputDTO],
        target_id_map: Dict[str, int]
    ) -> int:
        """批量创建 Website（存在即跳过）"""
        website_dtos = []
        seen = set()

        for dto in parsed_inputs:
            if not dto.website_url or dto.website_url in seen:
                continue
            seen.add(dto.website_url)
            target_id = target_id_map.get(dto.target_name)
            if target_id:
                website_dtos.append(WebSiteDTO(
                    target_id=target_id,
                    url=dto.website_url,
                    host=dto.target_name
                ))

        if not website_dtos:
            return 0
        return self.website_repo.bulk_create_ignore_conflicts(website_dtos)

    def _bulk_create_endpoints(
        self,
        parsed_inputs: List[ParsedInputDTO],
        target_id_map: Dict[str, int]
    ) -> int:
        """批量创建 Endpoint（存在即跳过）"""
        endpoint_dtos = []
        seen = set()

        for dto in parsed_inputs:
            if not dto.endpoint_url or dto.endpoint_url in seen:
                continue
            seen.add(dto.endpoint_url)
            target_id = target_id_map.get(dto.target_name)
            if target_id:
                endpoint_dtos.append(EndpointDTO(
                    target_id=target_id,
                    url=dto.endpoint_url,
                    host=dto.target_name
                ))

        if not endpoint_dtos:
            return 0
        return self.endpoint_repo.bulk_create_ignore_conflicts(endpoint_dtos)
