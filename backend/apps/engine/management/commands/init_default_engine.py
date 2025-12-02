"""
初始化默认扫描引擎

用法：python manage.py init_default_engine

功能：
- 读取 engine_config_example.yaml 作为默认配置
- 如果数据库中没有默认引擎，则创建一个
- 幂等操作，可以重复执行
"""

from django.core.management.base import BaseCommand
from pathlib import Path

import yaml

from apps.engine.models import ScanEngine


class Command(BaseCommand):
    help = '初始化默认扫描引擎配置'

    def handle(self, *args, **options):
        # 读取默认配置文件
        config_path = Path(__file__).resolve().parent.parent.parent.parent / 'scan' / 'configs' / 'engine_config_example.yaml'
        
        if not config_path.exists():
            self.stdout.write(self.style.ERROR(f'配置文件不存在: {config_path}'))
            return
        
        with open(config_path, 'r', encoding='utf-8') as f:
            default_config = f.read()

        # 解析 YAML 为字典，后续用于生成子引擎配置
        try:
            config_dict = yaml.safe_load(default_config) or {}
        except yaml.YAMLError as e:
            self.stdout.write(self.style.ERROR(f'引擎配置 YAML 解析失败: {e}'))
            return

        # 1) full scan：保留完整配置，作为默认引擎（is_default=True）
        engine, created = ScanEngine.objects.update_or_create(
            name='full scan',
            defaults={
                'configuration': default_config,
                'is_default': True,
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ 默认扫描引擎 full scan 已创建 (ID: {engine.id})'))
        else:
            self.stdout.write(self.style.SUCCESS(f'✓ 默认扫描引擎 full scan 配置已更新 (ID: {engine.id})'))

        # 2) 为每个扫描类型生成一个「单一扫描类型」的子引擎
        #    例如：subdomain_discovery, port_scan, ...
        from apps.scan.configs.command_templates import get_supported_scan_types

        supported_scan_types = set(get_supported_scan_types())

        for scan_type, scan_cfg in config_dict.items():
            # 只处理受支持且结构为 {tools: {...}} 的扫描类型
            if scan_type not in supported_scan_types:
                continue
            if not isinstance(scan_cfg, dict) or 'tools' not in scan_cfg:
                continue

            # 构造只包含当前扫描类型配置的 YAML
            single_config = {scan_type: scan_cfg}
            try:
                single_yaml = yaml.safe_dump(
                    single_config,
                    sort_keys=False,
                    allow_unicode=True,
                )
            except yaml.YAMLError as e:
                self.stdout.write(self.style.ERROR(f'生成子引擎 {scan_type} 配置失败: {e}'))
                continue

            engine_name = f"{scan_type}"
            sub_engine, sub_created = ScanEngine.objects.update_or_create(
                name=engine_name,
                defaults={
                    'configuration': single_yaml,
                    'is_default': False,
                },
            )

            if sub_created:
                self.stdout.write(self.style.SUCCESS(f'  ✓ 子引擎 {engine_name} 已创建 (ID: {sub_engine.id})'))
            else:
                self.stdout.write(self.style.SUCCESS(f'  ✓ 子引擎 {engine_name} 配置已更新 (ID: {sub_engine.id})'))
