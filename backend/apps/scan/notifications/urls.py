"""
通知系统 URL 配置
"""

from django.urls import path
from . import views
from .views import (
    NotificationCollectionView,
    NotificationMarkAllAsReadView,
    NotificationUnreadCountView,
)

app_name = 'notifications'

urlpatterns = [
    # 通知列表和删除
    path('', NotificationCollectionView.as_view(), name='list'),

    # 未读数量
    path('unread-count/', NotificationUnreadCountView.as_view(), name='unread-count'),

    # 标记全部已读
    path('mark-all-as-read/', NotificationMarkAllAsReadView.as_view(), name='mark-all-as-read'),
    
    # SSE 实时通知推送
    path('sse/', views.notifications_sse, name='sse'),
    
    # 测试通知
    path('test/', views.notifications_test, name='test'),
]
