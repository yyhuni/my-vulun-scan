# Generated manually

from django.db import migrations


class Migration(migrations.Migration):
    """
    删除 ScanTask 模型
    
    原因：
    - 系统从 Celery 迁移到 Prefect 3.x 后，不再需要追踪子任务状态
    - Prefect Handler 直接管理 Scan 状态（快速失败策略）
    - ScanTask 模型及相关服务已完全未被使用
    """

    dependencies = [
        ('scan', '0008_rename_status_values_to_prefect_terms'),
    ]

    operations = [
        migrations.DeleteModel(
            name='ScanTask',
        ),
    ]
