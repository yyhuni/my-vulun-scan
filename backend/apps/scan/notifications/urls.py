"""
通知系统 URL 配置
"""

from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    # SSE 实时通知推送
    path('sse/', views.notifications_sse, name='sse'),
    
    # 测试通知
    path('test/', views.notifications_test, name='test'),
]
