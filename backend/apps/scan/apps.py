from django.apps import AppConfig


class ScanConfig(AppConfig):
    """扫描应用配置类"""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.scan'