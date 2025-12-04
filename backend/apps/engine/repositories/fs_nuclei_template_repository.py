"""Nuclei 模板文件系统 Repository

负责从文件系统构建模板目录树并读取模板内容。
不依赖数据库，只访问文件系统。
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, List, Optional


class FileSystemNucleiTemplateRepository:
    """基于文件系统的 Nuclei 模板仓库实现"""

    def __init__(self, custom_root: Path, public_root: Path) -> None:
        self.custom_root = custom_root
        self.public_root = public_root

    # ==================== 目录树 ====================

    def get_tree(self) -> List[Dict]:
        """获取自定义模板和公共模板的目录树结构。

        Returns:
            list[dict]: roots 数组，每个 root 包含 type/name/path/children
        """

        roots: List[Dict] = []
        roots.append(self._build_root(self.custom_root, display_name="自定义模板", root_key="custom"))
        roots.append(self._build_root(self.public_root, display_name="公共模板", root_key="public"))
        return roots

    def _build_root(self, root_dir: Path, display_name: str, root_key: str) -> Dict:
        root_dir = root_dir.resolve()

        root_node: Dict = {
            "type": "folder",
            "name": display_name,
            "path": root_key,
            "children": [],
        }

        if not root_dir.exists() or not root_dir.is_dir():
            # 目录不存在时返回空 children 的根节点
            return root_node

        path_to_node: Dict[Path, Dict] = {root_dir: root_node}

        for dirpath, dirnames, filenames in os.walk(root_dir):
            current_dir = Path(dirpath)
            parent_node = path_to_node.get(current_dir)
            if parent_node is None:
                continue

            # 目录节点
            for dirname in sorted(dirnames):
                child_fs_path = current_dir / dirname
                rel = child_fs_path.relative_to(root_dir)  # like http/
                api_path = f"{root_key}/{rel.as_posix()}"  # custom/http

                node: Dict = {
                    "type": "folder",
                    "name": dirname,
                    "path": api_path,
                    "children": [],
                }
                parent_node.setdefault("children", []).append(node)
                path_to_node[child_fs_path] = node

            # 模板文件节点（仅 .yaml / .yml）
            for filename in sorted(filenames):
                if not (filename.endswith(".yaml") or filename.endswith(".yml")):
                    continue

                file_fs_path = current_dir / filename
                rel = file_fs_path.relative_to(root_dir)  # http/example.yaml
                api_path = f"{root_key}/{rel.as_posix()}"  # custom/http/example.yaml

                file_node: Dict = {
                    "type": "file",
                    "name": filename,
                    "path": api_path,
                }
                parent_node.setdefault("children", []).append(file_node)

        return root_node

    # ==================== 模板内容 ====================

    def get_file_content(self, api_path: str) -> Optional[Dict]:
        """根据前端传入的 path 获取模板内容。

        Args:
            api_path: 例如 "custom/http/example.yaml" 或 "public/cves/xxx.yaml"
        """

        api_path = (api_path or "").strip().lstrip("/")
        if not api_path:
            return None

        parts = api_path.split("/", 1)
        if len(parts) != 2:
            # 只有 root( custom/public ) 没有文件路径
            return None

        root_key, rel_part = parts
        if root_key == "custom":
            base_dir = self.custom_root
        elif root_key == "public":
            base_dir = self.public_root
        else:
            return None

        base_dir = base_dir.resolve()
        target_path = (base_dir / rel_part).resolve()

        # 目录穿越保护：必须在 base_dir 之下
        try:
            target_path.relative_to(base_dir)
        except ValueError:
            return None

        if not target_path.is_file():
            return None

        try:
            content = target_path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return None

        return {
            "path": api_path,
            "name": target_path.name,
            "content": content,
        }

    def save_file_content(self, api_path: str, content: str) -> bool:
        """保存模板内容到文件系统。

        Args:
            api_path: 前端的模板路径，例如 "custom/http/example.yaml"
            content: 要写入的 YAML 内容
        """

        api_path = (api_path or "").strip().lstrip("/")
        if not api_path:
            return False

        parts = api_path.split("/", 1)
        if len(parts) != 2:
            return False

        root_key, rel_part = parts
        if root_key == "custom":
            base_dir = self.custom_root
        elif root_key == "public":
            base_dir = self.public_root
        else:
            return False

        base_dir = base_dir.resolve()
        target_path = (base_dir / rel_part).resolve()

        try:
            target_path.relative_to(base_dir)
        except ValueError:
            return False

        target_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            target_path.write_text(content, encoding="utf-8")
        except OSError:
            return False

        return True
