"""
通用模块 URL 配置

路由说明：
- /api/health/    健康检查接口（无需认证）
- /api/auth/*     认证相关接口（登录、登出、用户信息）
- /api/system/*   系统管理接口（日志查看等）
"""

from django.urls import path
from .views import LoginView, LogoutView, MeView, ChangePasswordView, SystemLogsView, SystemLogFilesView, HealthCheckView

urlpatterns = [
    # 健康检查（无需认证）
    path('health/', HealthCheckView.as_view(), name='health-check'),
    
    # 认证相关
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    
    # 系统管理
    path('system/logs/', SystemLogsView.as_view(), name='system-logs'),
    path('system/logs/files/', SystemLogFilesView.as_view(), name='system-log-files'),
]
