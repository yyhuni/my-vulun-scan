"""Nuclei 模板仓库序列化器

用于 DRF ModelViewSet 的 CRUD 操作，将 NucleiTemplateRepo 模型序列化为 JSON。

字段说明：
- id: 仓库 ID（只读，自动生成）
- name: 仓库名称，用于前端展示
- repo_url: Git 仓库地址，如 https://github.com/projectdiscovery/nuclei-templates.git
- auth_type: 认证方式，"none"（公开仓库）或 "token"（需要凭据）
- local_path: 本地克隆路径（只读，由后端自动生成）
- branch: 分支名称，留空使用默认分支
- last_synced_at: 最后同步时间（只读）
- created_at: 创建时间（只读）
- updated_at: 更新时间（只读）

注意：auth_token 字段不在序列化器中，避免泄露敏感信息。
"""

from __future__ import annotations

from rest_framework import serializers

from apps.engine.models import NucleiTemplateRepo


class NucleiTemplateRepoSerializer(serializers.ModelSerializer):
    """Nuclei 模板仓库序列化器

    用于仓库的 CRUD API 响应。
    注意：不包含 auth_token 字段，保护敏感信息。
    """

    class Meta:
        model = NucleiTemplateRepo
        fields = [
            "id",           # 仓库 ID（只读）
            "name",         # 仓库名称
            "repo_url",     # Git 仓库地址
            "auth_type",    # 认证方式：none / token
            "local_path",   # 本地克隆路径（只读）
            "branch",       # 分支名称
            "last_synced_at",  # 最后同步时间（只读）
            "created_at",   # 创建时间（只读）
            "updated_at",   # 更新时间（只读）
        ]
        read_only_fields = [
            "id",
            "local_path",      # 由后端根据 name 自动生成
            "last_synced_at",  # 由 refresh 操作更新
            "created_at",
            "updated_at",
        ]


__all__ = ["NucleiTemplateRepoSerializer"]
