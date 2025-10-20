"""
自定义分页器，匹配前端响应格式
"""
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CustomPageNumberPagination(PageNumberPagination):
    """
    自定义分页器，返回格式匹配前端期望：
    {
        "results": [...], 
        "total": 100,
        "page": 1,
        "page_size": 20,
        "total_pages": 5
    }
    """
    page_size = 20  # 默认每页 20 条
    page_size_query_param = 'page_size'  # 允许客户端自定义每页数量
    max_page_size = 100  # 最大每页 100 条
    
    def get_resource_name(self):
        """
        返回分页结果列表的属性名
        """
        # 默认返回 'results'
        return 'results'
    
    def get_paginated_response(self, data):
        """
        自定义响应格式
        """
        # 获取资源名称（如 organizations, domains）
        resource_name = self.get_resource_name()
        
        return Response({
            resource_name: data,  # 数据列表
            'total': self.page.paginator.count,  # 总记录数
            'page': self.page.number,  # 当前页码（从 1 开始）
            'page_size': self.page_size,  # 每页大小
            'total_pages': self.page.paginator.num_pages  # 总页数
        })
    

