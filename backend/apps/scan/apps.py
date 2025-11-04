from django.apps import AppConfig


class ScanConfig(AppConfig):
    """扫描应用配置类"""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.scan'
    
    def ready(self):
        """
        应用就绪时的回调
        
        注册 Celery 任务信号处理器，实现状态管理、通知和清理的解耦架构
        """
        # 导入信号注册函数
        from apps.scan.signals import register_all_signals
        # 注册所有信号处理器
        register_all_signals()