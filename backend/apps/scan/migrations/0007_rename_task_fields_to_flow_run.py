# Generated manually

from django.db import migrations, models
from django.contrib.postgres.fields import ArrayField


class Migration(migrations.Migration):

    dependencies = [
        ('scan', '0006_convert_status_to_text'),
    ]

    operations = [
        # 重命名 Scan 模型的字段
        migrations.RenameField(
            model_name='scan',
            old_name='task_ids',
            new_name='flow_run_ids',
        ),
        migrations.RenameField(
            model_name='scan',
            old_name='task_names',
            new_name='flow_run_names',
        ),
        
        # 重命名 ScanTask 模型的字段
        migrations.RenameField(
            model_name='scantask',
            old_name='task_id',
            new_name='flow_run_id',
        ),
        
        # 更新字段的 help_text
        migrations.AlterField(
            model_name='scan',
            name='flow_run_ids',
            field=ArrayField(
                base_field=models.CharField(max_length=100),
                blank=True,
                default=list,
                help_text='Prefect Flow Run ID 列表（第一个为主 Flow Run ID）',
                size=None,
            ),
        ),
        migrations.AlterField(
            model_name='scan',
            name='flow_run_names',
            field=ArrayField(
                base_field=models.CharField(max_length=200),
                blank=True,
                default=list,
                help_text='Flow Run 名称列表',
                size=None,
            ),
        ),
        migrations.AlterField(
            model_name='scantask',
            name='flow_run_id',
            field=models.CharField(
                blank=True,
                db_index=True,
                default='',
                help_text='Prefect Flow Run ID 或 Task Run ID',
                max_length=100,
            ),
        ),
    ]
