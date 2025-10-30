from rest_framework import viewsets
from .models import Organization, Domain
from .serializers import OrganizationSerializer, DomainSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    """组织管理 - 增删改查"""
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer


class DomainViewSet(viewsets.ModelViewSet):
    """域名管理 - 增删改查"""
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer
