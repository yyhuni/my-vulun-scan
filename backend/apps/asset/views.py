import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.db import DatabaseError, IntegrityError, OperationalError

from .serializers import SubdomainListSerializer, WebSiteSerializer, DirectorySerializer
from .services import SubdomainService, WebSiteService, DirectoryService

logger = logging.getLogger(__name__)


# 注意：IPAddress 模型已被重构为 HostPortMapping
# IPAddressViewSet 已删除，需要根据新架构重新实现


class SubdomainViewSet(viewsets.ModelViewSet):
    """子域名管理 ViewSet"""
    
    serializer_class = SubdomainListSerializer
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SubdomainService()
    
    def get_queryset(self):
        """通过 Service 层获取查询集"""
        return self.service.get_all()


class WebSiteViewSet(viewsets.ModelViewSet):
    """站点管理 ViewSet"""
    
    serializer_class = WebSiteSerializer
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = WebSiteService()
    
    def get_queryset(self):
        """通过 Service 层获取查询集"""
        return self.service.get_all()


class DirectoryViewSet(viewsets.ModelViewSet):
    """目录管理 ViewSet"""
    
    serializer_class = DirectorySerializer
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = DirectoryService()
    
    def get_queryset(self):
        """通过 Service 层获取查询集"""
        return self.service.get_all()
