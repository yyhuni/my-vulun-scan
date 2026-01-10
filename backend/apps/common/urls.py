"""
通用模块 URL 配置

路由说明：
- /api/health/       健康检查接口（无需认证）
- /api/auth/*        认证相关接口（登录、登出、用户信息）
- /api/system/*      系统管理接口（日志查看等）
- /api/blacklist/*   黑名单管理接口
"""

from django.urls import path

from .views import (
    LoginView, LogoutView, MeView, ChangePasswordView,
    SystemLogsView, SystemLogFilesView, HealthCheckView,
    GlobalBlacklistView,
    VersionView, CheckUpdateView,
)

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
    path('system/version/', VersionView.as_view(), name='system-version'),
    path('system/check-update/', CheckUpdateView.as_view(), name='system-check-update'),
    
    # 黑名单管理（PUT 全量替换模式）
    path('blacklist/rules/', GlobalBlacklistView.as_view(), name='blacklist-rules'),
]
