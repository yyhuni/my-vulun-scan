"""Nuclei 模板业务服务层

负责封装 Nuclei 模板目录树与模板内容的业务逻辑。
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

import logging
import os
import shutil
import subprocess

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile

from apps.engine.repositories.fs_nuclei_template_repository import (
    FileSystemNucleiTemplateRepository,
)


logger = logging.getLogger(__name__)


class NucleiTemplateService:
    """Nuclei 模板业务逻辑服务"""

    def __init__(self) -> None:
        custom_root = Path(getattr(settings, "NUCLEI_CUSTOM_TEMPLATES_DIR", "/opt/xingrin/nuclei-templates/custom"))
        public_root = Path(getattr(settings, "NUCLEI_PUBLIC_TEMPLATES_DIR", "/opt/xingrin/nuclei-templates/public"))
        self.repo = FileSystemNucleiTemplateRepository(custom_root=custom_root, public_root=public_root)
        self.custom_root = custom_root
        self.public_root = public_root
        self.repo_dir = Path.home() / "nuclei-templates"
        self.repo_url = getattr(
            settings,
            "NUCLEI_TEMPLATES_REPO_URL",
            "https://github.com/projectdiscovery/nuclei-templates.git",
        )

    # ==================== 目录树 ====================

    def get_template_tree(self) -> List[Dict]:
        return self.repo.get_tree()

    # ==================== 模板内容 ====================

    def get_template_content(self, api_path: str) -> Optional[Dict]:
        return self.repo.get_file_content(api_path)

    def save_template_content(self, api_path: str, content: str) -> None:
        api_path = (api_path or "").strip()
        if not api_path:
            raise ValidationError("path 不能为空")

        if not self.repo.save_file_content(api_path, content or ""):
            raise ValidationError("无法保存模板内容，路径无效或写入失败")

    def upload_template(self, scope: str, uploaded_file: UploadedFile) -> Dict[str, Any]:
        scope = (scope or "").strip()
        if scope not in ("custom", "public"):
            raise ValidationError("无效的 scope，必须为 custom 或 public")

        if not uploaded_file:
            raise ValidationError("缺少上传文件")

        if not uploaded_file.name:
            raise ValidationError("模板文件名不能为空")

        base_root = self.custom_root if scope == "custom" else self.public_root
        base_root = base_root.resolve()
        base_root.mkdir(parents=True, exist_ok=True)

        original_name = os.path.basename(uploaded_file.name)
        safe_name = original_name.replace("/", "_").replace("\\", "_") or "template.yaml"
        base, ext = os.path.splitext(safe_name)
        if ext.lower() not in (".yaml", ".yml"):
            safe_name = f"{base}.yaml"

        target_path = (base_root / safe_name).resolve()
        try:
            target_path.relative_to(base_root)
        except ValueError:
            raise ValidationError("目标路径非法")

        with open(target_path, "wb+") as dest:
            for chunk in uploaded_file.chunks():
                dest.write(chunk)

        api_path = f"{scope}/{safe_name}"
        return {
            "scope": scope,
            "path": api_path,
            "name": safe_name,
        }

    # ==================== 更新官方模板 ====================

    def refresh_official_templates(self) -> Dict[str, Any]:
        repo_dir = self.repo_dir
        repo_dir.parent.mkdir(parents=True, exist_ok=True)

        git_dir = repo_dir / ".git"
        if git_dir.is_dir():
            result = subprocess.run(
                ["git", "-C", str(repo_dir), "pull", "--ff-only"],
                check=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            if result.returncode != 0:
                logger.warning("nuclei-templates git pull 失败: %s", result.stderr.strip())
                raise RuntimeError("拉取 nuclei-templates 仓库失败")
        else:
            if repo_dir.exists() and not repo_dir.is_dir():
                raise RuntimeError(f"路径已存在且不是目录: {repo_dir}")
            if not repo_dir.exists():
                result = subprocess.run(
                    ["git", "clone", "--depth", "1", self.repo_url, str(repo_dir)],
                    check=False,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                )
                if result.returncode != 0:
                    logger.warning("nuclei-templates git clone 失败: %s", result.stderr.strip())
                    raise RuntimeError("克隆 nuclei-templates 仓库失败")

        public_root = self.public_root.resolve()
        public_root.mkdir(parents=True, exist_ok=True)

        copied = 0
        for ext in ("*.yaml", "*.yml"):
            for src in repo_dir.rglob(ext):
                if not src.is_file():
                    continue
                rel = src.relative_to(repo_dir)
                dst = public_root / rel
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                copied += 1

        logger.info("nuclei 模板更新完成: 复制文件数量=%s", copied)
        return {
            "templatesCopied": copied,
            "publicRoot": str(public_root),
        }
