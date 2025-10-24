"""
自定义分页器，匹配前端响应格式
"""
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class BasePagination(PageNumberPagination):
    """
    基础分页器，提供通用配置
    子类只需要指定 data_key 即可
    """
    page_size = 10  # 默认每页 10 条
    page_size_query_param = 'pageSize'  # 允许客户端自定义每页数量（使用驼峰命名匹配前端）
    max_page_size = 1000  # 最大每页数量限制
    data_key = 'results'  # 默认数据字段名，子类覆盖此属性
    
    def get_paginated_response(self, data):
        """
        自定义响应格式
        """
        return Response({
            self.data_key: data,  # 数据列表（字段名由子类指定）
            'total': self.page.paginator.count,  # 总记录数
            'page': self.page.number,  # 当前页码（从 1 开始）
            'page_size': self.page.paginator.per_page,  # 实际使用的每页大小
            'total_pages': self.page.paginator.num_pages  # 总页数
        })


class OrganizationPagination(BasePagination):
    """
    组织专用分页器
    返回格式：
    {
        "organizations": [...],
        "total": 100,
        "page": 1,
        "page_size": 10,
        "total_pages": 5
    }
    """
    data_key = 'organizations'


class AssetPagination(BasePagination):
    """资产专用分页器"""
    data_key = 'assets'


class DomainPagination(BasePagination):
    """域名专用分页器"""
    data_key = 'domains'




class EndpointPagination(BasePagination):
    """端点专用分页器"""
    data_key = 'endpoints'


class ToolPagination(BasePagination):
    """工具专用分页器"""
    data_key = 'tools'


class CommandPagination(BasePagination):
    """命令专用分页器"""
    data_key = 'commands'


class NotificationPagination(BasePagination):
    """通知专用分页器"""
    data_key = 'notifications'


