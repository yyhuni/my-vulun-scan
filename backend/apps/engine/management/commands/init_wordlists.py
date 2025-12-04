"""初始化所有内置字典 Wordlist 记录

- 目录扫描默认字典: dir_default.txt -> /app/backend/wordlist/dir_default.txt
- 子域名爆破默认字典: subdomains-top1million-110000.txt -> /app/backend/wordlist/subdomains-top1million-110000.txt

可重复执行：如果已存在同名记录且文件有效则跳过，只在缺失或文件丢失时创建/修复。
"""

import logging
import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.engine.models import Wordlist


logger = logging.getLogger(__name__)


DEFAULT_WORDLISTS = [
    {
        "name": "dir_default.txt",
        "filename": "dir_default.txt",
        "description": "内置默认目录字典",
    },
    {
        "name": "subdomains-top1million-110000.txt",
        "filename": "subdomains-top1million-110000.txt",
        "description": "内置默认子域名字典",
    },
]


class Command(BaseCommand):
    help = "初始化所有内置字典 Wordlist 记录"

    def handle(self, *args, **options):
        project_base = Path(settings.BASE_DIR).parent  # /app/backend -> /app
        base_wordlist_dir = project_base / "backend" / "wordlist"
        runtime_base_dir = Path(getattr(settings, "WORDLISTS_BASE_PATH", "/opt/xingrin/wordlists"))
        runtime_base_dir.mkdir(parents=True, exist_ok=True)

        initialized = 0
        skipped = 0
        failed = 0

        for item in DEFAULT_WORDLISTS:
            name = item["name"]
            filename = item["filename"]
            description = item["description"]

            existing = Wordlist.objects.filter(name=name).first()
            if existing:
                file_path = existing.file_path or ""
                if file_path and Path(file_path).exists():
                    # 记录和文件都在，直接跳过
                    self.stdout.write(self.style.SUCCESS(
                        f"[{name}] 已存在且文件有效，跳过初始化 (file_path={file_path})"
                    ))
                    skipped += 1
                    continue
                else:
                    self.stdout.write(self.style.WARNING(
                        f"[{name}] 记录已存在但物理文件丢失，将重新创建文件路径并修复记录"
                    ))

            src_path = base_wordlist_dir / filename
            dest_path = runtime_base_dir / filename

            if not src_path.exists():
                self.stdout.write(self.style.WARNING(
                    f"[{name}] 未找到内置字典文件: {src_path}，跳过"
                ))
                failed += 1
                continue

            try:
                shutil.copy2(src_path, dest_path)
            except OSError as exc:
                self.stdout.write(self.style.WARNING(
                    f"[{name}] 复制内置字典到运行目录失败: {exc}"
                ))
                failed += 1
                continue

            # 统计文件大小和行数
            try:
                file_size = dest_path.stat().st_size
            except OSError:
                file_size = 0

            line_count = 0
            try:
                with dest_path.open("rb") as f:
                    for _ in f:
                        line_count += 1
            except OSError:
                logger.warning("统计字典行数失败: %s", src_path)

            # 如果之前已有记录则更新，否则创建新记录
            if existing:
                existing.file_path = str(dest_path)
                existing.file_size = file_size
                existing.line_count = line_count
                existing.description = existing.description or description
                existing.save(update_fields=[
                    "file_path",
                    "file_size",
                    "line_count",
                    "description",
                    "updated_at",
                ])
                wordlist = existing
                action = "更新"
            else:
                wordlist = Wordlist.objects.create(
                    name=name,
                    description=description,
                    file_path=str(dest_path),
                    file_size=file_size,
                    line_count=line_count,
                )
                action = "创建"

            initialized += 1
            self.stdout.write(self.style.SUCCESS(
                f"[{name}] {action}字典记录成功: id={wordlist.id}, size={wordlist.file_size}, lines={wordlist.line_count}"
            ))

        self.stdout.write(self.style.SUCCESS(
            f"初始化完成: 成功 {initialized}, 已存在跳过 {skipped}, 文件缺失 {failed}"
        ))
