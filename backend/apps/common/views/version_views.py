"""
系统版本相关视图
"""

import logging
from pathlib import Path

import requests
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.error_codes import ErrorCodes
from apps.common.response_helpers import error_response, success_response

logger = logging.getLogger(__name__)

# GitHub 仓库信息
GITHUB_REPO = "yyhuni/xingrin"
GITHUB_API_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
GITHUB_RELEASES_URL = f"https://github.com/{GITHUB_REPO}/releases"


def get_current_version() -> str:
    """读取当前版本号"""
    version_file = Path(__file__).parent.parent.parent.parent.parent / 'VERSION'
    try:
        return version_file.read_text(encoding='utf-8').strip()
    except FileNotFoundError:
        return "unknown"


def compare_versions(current: str, latest: str) -> bool:
    """
    比较版本号，判断是否有更新

    Returns:
        True 表示有更新可用
    """
    def parse_version(v: str) -> tuple:
        v = v.lstrip('v')
        parts = v.split('.')
        result = []
        for part in parts:
            if '-' in part:
                num, _ = part.split('-', 1)
                result.append(int(num))
            else:
                result.append(int(part))
        return tuple(result)

    try:
        return parse_version(latest) > parse_version(current)
    except (ValueError, AttributeError):
        return False


class VersionView(APIView):
    """获取当前系统版本"""

    def get(self, _request: Request) -> Response:
        """获取当前版本信息"""
        return success_response(data={
            'version': get_current_version(),
            'github_repo': GITHUB_REPO,
        })


class CheckUpdateView(APIView):
    """检查系统更新"""

    def get(self, _request: Request) -> Response:
        """
        检查是否有新版本

        Returns:
            - current_version: 当前版本
            - latest_version: 最新版本
            - has_update: 是否有更新
            - release_url: 发布页面 URL
            - release_notes: 更新说明（如果有）
        """
        current_version = get_current_version()

        try:
            response = requests.get(
                GITHUB_API_URL,
                headers={'Accept': 'application/vnd.github.v3+json'},
                timeout=10
            )

            if response.status_code == 404:
                return success_response(data={
                    'current_version': current_version,
                    'latest_version': current_version,
                    'has_update': False,
                    'release_url': GITHUB_RELEASES_URL,
                    'release_notes': None,
                })

            response.raise_for_status()
            release_data = response.json()

            latest_version = release_data.get('tag_name', current_version)
            has_update = compare_versions(current_version, latest_version)

            return success_response(data={
                'current_version': current_version,
                'latest_version': latest_version,
                'has_update': has_update,
                'release_url': release_data.get('html_url', GITHUB_RELEASES_URL),
                'release_notes': release_data.get('body'),
                'published_at': release_data.get('published_at'),
            })

        except requests.RequestException as e:
            logger.warning("检查更新失败: %s", e)
            return error_response(
                code=ErrorCodes.SERVER_ERROR,
                message="无法连接到 GitHub，请稍后重试",
            )
