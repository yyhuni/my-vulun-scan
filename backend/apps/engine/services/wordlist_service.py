"""Wordlist 业务逻辑服务层（Service）

负责字典文件相关的业务逻辑处理
"""

import logging
import os
import time
from typing import Optional

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile

from apps.engine.models import Wordlist
from apps.engine.repositories import DjangoWordlistRepository


logger = logging.getLogger(__name__)


class WordlistService:
    """字典文件业务逻辑服务"""

    def __init__(self) -> None:
        """初始化服务，注入 Repository 依赖"""
        self.repo = DjangoWordlistRepository()

    def get_queryset(self):
        """获取字典列表查询集"""
        return self.repo.get_queryset()

    def get_wordlist(self, wordlist_id: int) -> Optional[Wordlist]:
        """根据 ID 获取字典"""
        return self.repo.get_by_id(wordlist_id)

    def create_wordlist(
        self,
        name: str,
        description: str,
        uploaded_file: UploadedFile,
    ) -> Wordlist:
        """创建字典文件记录并保存物理文件"""

        name = (name or "").strip()
        if not name:
            raise ValidationError("字典名称不能为空")

        if self._exists_by_name(name):
            raise ValidationError("已存在同名字典")

        base_dir = getattr(settings, "SCAN_TOOLS_BASE_PATH", "/opt/github")
        storage_dir = os.path.join(base_dir, "wordlists")
        os.makedirs(storage_dir, exist_ok=True)

        # 按原始文件名保存（做最小清洗），同名上传时覆盖旧文件
        original_name = os.path.basename(uploaded_file.name or "wordlist.txt")
        # 仅清理路径分隔符，保留空格等字符，避免目录穿越
        safe_name = original_name.replace("/", "_").replace("\\", "_") or "wordlist.txt"
        # 如果没有扩展名，补一个 .txt，方便识别
        base, ext = os.path.splitext(safe_name)
        if not ext:
            safe_name = f"{base}.txt"

        full_path = os.path.join(storage_dir, safe_name)

        with open(full_path, "wb+") as dest:
            for chunk in uploaded_file.chunks():
                dest.write(chunk)

        try:
            file_size = os.path.getsize(full_path)
        except OSError:
            file_size = 0

        line_count = 0
        try:
            with open(full_path, "rb") as f:
                for _ in f:
                    line_count += 1
        except OSError:
            logger.warning("统计字典行数失败: %s", full_path)

        wordlist = self.repo.create(
            name=name,
            description=description or "",
            file_path=full_path,
            file_size=file_size,
            line_count=line_count,
        )

        logger.info(
            "创建字典: id=%s, name=%s, size=%s, lines=%s",
            wordlist.id,
            wordlist.name,
            wordlist.file_size,
            wordlist.line_count,
        )
        return wordlist

    def delete_wordlist(self, wordlist_id: int) -> bool:
        """删除字典记录及对应的物理文件"""
        wordlist: Optional[Wordlist] = self.repo.get_by_id(wordlist_id)
        if not wordlist:
            return False

        file_path = wordlist.file_path
        if file_path:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except OSError as exc:
                logger.warning("删除字典文件失败: %s - %s", file_path, exc)

        return self.repo.delete(wordlist_id)

    def _exists_by_name(self, name: str) -> bool:
        """判断是否存在同名的字典"""
        return self.repo.get_queryset().filter(name=name).exists()


__all__ = ["WordlistService"]
