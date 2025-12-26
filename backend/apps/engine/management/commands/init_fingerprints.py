"""初始化内置指纹库

- EHole 指纹: ehole.json -> 导入到数据库

可重复执行：如果数据库已有数据则跳过，只在空库时导入。
"""

import json
import logging
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.engine.models import EholeFingerprint
from apps.engine.services.fingerprints import EholeFingerprintService


logger = logging.getLogger(__name__)


# 内置指纹配置
DEFAULT_FINGERPRINTS = [
    {
        "type": "ehole",
        "filename": "ehole.json",
        "model": EholeFingerprint,
        "service": EholeFingerprintService,
        "data_key": "fingerprint",  # JSON 中指纹数组的 key
    },
    # TODO: 后续添加 Goby, Wappalyzer
]


class Command(BaseCommand):
    help = "初始化内置指纹库"

    def handle(self, *args, **options):
        project_base = Path(settings.BASE_DIR).parent  # /app/backend -> /app
        fingerprints_dir = project_base / "backend" / "fingerprints"

        initialized = 0
        skipped = 0
        failed = 0

        for item in DEFAULT_FINGERPRINTS:
            fp_type = item["type"]
            filename = item["filename"]
            model = item["model"]
            service_class = item["service"]
            data_key = item["data_key"]

            # 检查数据库是否已有数据
            existing_count = model.objects.count()
            if existing_count > 0:
                self.stdout.write(self.style.SUCCESS(
                    f"[{fp_type}] 数据库已有 {existing_count} 条记录，跳过初始化"
                ))
                skipped += 1
                continue

            # 查找源文件
            src_path = fingerprints_dir / filename
            if not src_path.exists():
                self.stdout.write(self.style.WARNING(
                    f"[{fp_type}] 未找到内置指纹文件: {src_path}，跳过"
                ))
                failed += 1
                continue

            # 读取并解析 JSON
            try:
                with open(src_path, "r", encoding="utf-8") as f:
                    json_data = json.load(f)
            except (json.JSONDecodeError, OSError) as exc:
                self.stdout.write(self.style.ERROR(
                    f"[{fp_type}] 读取指纹文件失败: {exc}"
                ))
                failed += 1
                continue

            # 提取指纹数据
            fingerprints = json_data.get(data_key, [])
            if not fingerprints:
                self.stdout.write(self.style.WARNING(
                    f"[{fp_type}] 指纹文件中没有有效数据，跳过"
                ))
                failed += 1
                continue

            # 使用 Service 批量导入
            try:
                service = service_class()
                result = service.batch_create_fingerprints(fingerprints)
                created = result.get("created", 0)
                failed_count = result.get("failed", 0)

                self.stdout.write(self.style.SUCCESS(
                    f"[{fp_type}] 导入成功: 创建 {created} 条，失败 {failed_count} 条"
                ))
                initialized += 1
            except Exception as exc:
                self.stdout.write(self.style.ERROR(
                    f"[{fp_type}] 导入失败: {exc}"
                ))
                failed += 1
                continue

        self.stdout.write(self.style.SUCCESS(
            f"指纹初始化完成: 成功 {initialized}, 已存在跳过 {skipped}, 失败 {failed}"
        ))
