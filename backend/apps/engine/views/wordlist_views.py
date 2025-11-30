"""字典管理 API Views"""

import os

from django.core.exceptions import ValidationError
from django.http import FileResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.pagination import BasePagination
from apps.engine.serializers.wordlist_serializer import WordlistSerializer
from apps.engine.services.wordlist_service import WordlistService


class WordlistViewSet(viewsets.ViewSet):
    """字典管理 ViewSet"""

    pagination_class = BasePagination

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.service = WordlistService()

    @property
    def paginator(self):
        """懒加载分页器实例"""
        if not hasattr(self, "_paginator"):
            if self.pagination_class is None:
                self._paginator = None
            else:
                self._paginator = self.pagination_class()
        return self._paginator

    def list(self, request):
        """获取字典列表"""
        queryset = self.service.get_queryset()
        page = self.paginator.paginate_queryset(queryset, request, view=self)
        serializer = WordlistSerializer(page, many=True)
        return self.paginator.get_paginated_response(serializer.data)

    def create(self, request):
        """上传并创建字典记录"""
        name = (request.data.get("name", "") or "").strip()
        description = request.data.get("description", "") or ""
        uploaded_file = request.FILES.get("file")

        if not uploaded_file:
            return Response({"error": "缺少字典文件"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            wordlist = self.service.create_wordlist(
                name=name,
                description=description,
                uploaded_file=uploaded_file,
            )
        except ValidationError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = WordlistSerializer(wordlist)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        """删除字典记录"""
        try:
            wordlist_id = int(pk)
        except (TypeError, ValueError):
            return Response({"error": "无效的 ID"}, status=status.HTTP_400_BAD_REQUEST)

        success = self.service.delete_wordlist(wordlist_id)
        if not success:
            return Response({"error": "字典不存在"}, status=status.HTTP_404_NOT_FOUND)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        """下载字典文件内容"""
        try:
            wordlist_id = int(pk)
        except (TypeError, ValueError):
            return Response({"error": "无效的 ID"}, status=status.HTTP_400_BAD_REQUEST)

        wordlist = self.service.get_wordlist(wordlist_id)
        if not wordlist:
            return Response({"error": "字典不存在"}, status=status.HTTP_404_NOT_FOUND)

        file_path = wordlist.file_path
        if not file_path or not os.path.exists(file_path):
            return Response({"error": "字典文件不存在"}, status=status.HTTP_404_NOT_FOUND)

        filename = os.path.basename(file_path)
        response = FileResponse(open(file_path, "rb"), as_attachment=True, filename=filename)
        return response
