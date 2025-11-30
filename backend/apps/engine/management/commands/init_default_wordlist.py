"""初始化默认目录字典 Wordlist 记录

- 名称固定为 default_dict.txt
- 文件来源于镜像内的 /app/backend/wordlist/default_dict.txt
- 保存到 SCAN_TOOLS_BASE_PATH/wordlists 目录

可重复执行：如果已存在同名记录则跳过。
"""

import logging
import os
import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.engine.models import Wordlist


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "初始化默认目录字典 default_dict.txt"

    def handle(self, *args, **options):
        default_name = "default_dict.txt"
        existing = Wordlist.objects.filter(name=default_name).first()

        # 如果已存在同名字典，优先检查物理文件是否存在
        if existing:
            file_path = existing.file_path or ""
            if file_path and Path(file_path).exists():
                # 记录和文件都在，直接跳过
                self.stdout.write(self.style.SUCCESS(
                    f"默认字典 '{default_name}' 已存在且文件有效，跳过初始化"
                ))
                return
            else:
                # 记录存在但文件丢失，进行自愈修复
                self.stdout.write(self.style.WARNING(
                    f"默认字典 '{default_name}' 记录已存在但物理文件丢失，将重新创建文件并修复记录"
                ))

        # 镜像内内置字典路径（server 容器中的路径）
        project_base = Path(settings.BASE_DIR).parent  # /app/backend -> /app
        src_path = project_base / "backend" / "wordlist" / default_name

        if not src_path.exists():
            self.stdout.write(self.style.WARNING(
                f"未找到内置默认字典文件: {src_path}，跳过初始化"
            ))
            return

        base_dir = getattr(settings, "SCAN_TOOLS_BASE_PATH", "/opt/github")
        storage_dir = Path(base_dir) / "wordlists"
        storage_dir.mkdir(parents=True, exist_ok=True)

        dst_path = storage_dir / default_name

        # 拷贝文件到统一的字典存储目录
        try:
            shutil.copy2(src_path, dst_path)
        except OSError as exc:
            self.stdout.write(self.style.ERROR(
                f"复制默认字典文件失败: {src_path} -> {dst_path} - {exc}"
            ))
            return

        # 统计文件大小和行数
        try:
            file_size = dst_path.stat().st_size
        except OSError:
            file_size = 0

        line_count = 0
        try:
            with dst_path.open("rb") as f:
                for _ in f:
                    line_count += 1
        except OSError:
            logger.warning("统计默认字典行数失败: %s", dst_path)

        # 如果之前已有记录则更新，否则创建新记录
        if existing:
            existing.file_path = str(dst_path)
            existing.file_size = file_size
            existing.line_count = line_count
            existing.description = existing.description or "内置默认目录字典"
            existing.save(update_fields=["file_path", "file_size", "line_count", "description", "updated_at"])
            wordlist = existing
        else:
            wordlist = Wordlist.objects.create(
                name=default_name,
                description="内置默认目录字典",
                file_path=str(dst_path),
                file_size=file_size,
                line_count=line_count,
            )

        self.stdout.write(self.style.SUCCESS(
            f"已初始化默认字典: id={wordlist.id}, name={wordlist.name}, "
            f"size={wordlist.file_size}, lines={wordlist.line_count}"
        ))
