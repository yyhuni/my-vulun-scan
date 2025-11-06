# Generated manually on 2025-11-06
# 为 ScanTask 添加必要的索引以优化查询性能

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scan', '0002_update_started_at_field'),
    ]

    operations = [
        # 为 task_id 字段添加索引
        migrations.AlterField(
            model_name='scantask',
            name='task_id',
            field=models.CharField(
                max_length=100,
                blank=True,
                default='',
                db_index=True,
                help_text='Celery 异步任务的唯一标识符'
            ),
        ),
        # 添加组合索引：scan + task_id（优化 update_or_create 查询）
        migrations.AddIndex(
            model_name='scantask',
            index=models.Index(fields=['scan', 'task_id'], name='scan_task_scan_task_idx'),
        ),
        # 添加组合索引：scan + status（优化状态查询）
        migrations.AddIndex(
            model_name='scantask',
            index=models.Index(fields=['scan', 'status'], name='scan_task_scan_status_idx'),
        ),
    ]

