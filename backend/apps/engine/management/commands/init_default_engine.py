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

from apps.engine.models import ScanEngine


class Command(BaseCommand):
    help = '初始化默认扫描引擎配置'

    def handle(self, *args, **options):
        # 检查是否已存在默认引擎
        if ScanEngine.objects.filter(is_default=True).exists():
            self.stdout.write(self.style.WARNING('默认扫描引擎已存在，跳过初始化'))
            return
        
        # 读取默认配置文件
        config_path = Path(__file__).resolve().parent.parent.parent.parent / 'scan' / 'configs' / 'engine_config_example.yaml'
        
        if not config_path.exists():
            self.stdout.write(self.style.ERROR(f'配置文件不存在: {config_path}'))
            return
        
        with open(config_path, 'r', encoding='utf-8') as f:
            default_config = f.read()
        
        # 创建默认引擎
        engine = ScanEngine.objects.create(
            name='full scan',
            configuration=default_config,
            is_default=True
        )
        
        self.stdout.write(self.style.SUCCESS(f'✓ 默认扫描引擎已创建 (ID: {engine.id})'))
