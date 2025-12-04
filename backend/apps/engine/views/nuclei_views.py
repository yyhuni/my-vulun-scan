"""Nuclei 模板相关 API Views"""

from __future__ import annotations

import logging

from django.core.exceptions import ValidationError

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.engine.services.nuclei_template_service import NucleiTemplateService


logger = logging.getLogger(__name__)


class NucleiTemplateViewSet(viewsets.ViewSet):
    """Nuclei 模板浏览 API

    提供：
    - GET /api/nuclei/templates/tree/    获取目录树
    - GET /api/nuclei/templates/content/ 获取单个模板内容
    """

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.service = NucleiTemplateService()

    @action(detail=False, methods=["get"], url_path="tree")
    def tree(self, request):
        roots = self.service.get_template_tree()
        return Response({"roots": roots})

    @action(detail=False, methods=["get"], url_path="content")
    def content(self, request):
        api_path = (request.query_params.get("path", "") or "").strip()
        if not api_path:
            return Response({"message": "缺少 path 参数"}, status=status.HTTP_400_BAD_REQUEST)

        result = self.service.get_template_content(api_path)
        if result is None:
            return Response({"message": "模板不存在或无法读取"}, status=status.HTTP_404_NOT_FOUND)

        return Response(result)

    @action(detail=False, methods=["post"], url_path="save")
    def save(self, request):
        path = (request.data.get("path", "") or "").strip()
        content = request.data.get("content", "")
        if not path:
            return Response({"message": "缺少 path 参数"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            self.service.save_template_content(path, content)
        except ValidationError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # noqa: BLE001
            logger.error("保存 nuclei 模板失败: %s", exc, exc_info=True)
            return Response({"message": "保存 nuclei 模板失败"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"message": "保存成功"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="upload")
    def upload(self, request):
        scope = (request.data.get("scope", "") or "").strip()
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"message": "缺少文件"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = self.service.upload_template(scope, uploaded_file)
        except ValidationError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:  # noqa: BLE001
            logger.error("上传 nuclei 模板失败: %s", exc, exc_info=True)
            return Response({"message": "上传 nuclei 模板失败"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="refresh")
    def refresh(self, request):
        try:
            result = self.service.refresh_official_templates()
        except Exception as exc:  # noqa: BLE001
            logger.error("刷新 nuclei 模板失败: %s", exc, exc_info=True)
            return Response({"message": "刷新 nuclei 模板失败"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({"message": "刷新 nuclei 模板成功", "result": result}, status=status.HTTP_200_OK)
