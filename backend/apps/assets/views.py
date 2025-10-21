"""
资产管理视图
"""

from rest_framework import viewsets, status
from rest_framework.response import Response
from django.db.models import Q
from .models import Organization
from .serializers import OrganizationSerializer
from apps.common.pagination import OrganizationPagination


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    组织管理视图集
    """
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    pagination_class = OrganizationPagination
    


