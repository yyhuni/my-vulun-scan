from rest_framework import viewsets
from .models import Organization, Target
from .serializers import OrganizationSerializer, TargetSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    """组织管理 - 增删改查"""
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer


class TargetViewSet(viewsets.ModelViewSet):
    """目标管理 - 增删改查"""
    queryset = Target.objects.all()
    serializer_class = TargetSerializer