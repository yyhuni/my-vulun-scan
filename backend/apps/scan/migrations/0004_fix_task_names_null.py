# Generated manually on 2025-11-06
# 修复 Scan.task_names 字段的 NULL 问题
# 将 null=True 改为 blank=True, default=list，并将现有 NULL 值转换为空数组

from django.db import migrations, models
from django.contrib.postgres.fields import ArrayField


def convert_null_to_empty_array(apps, schema_editor):
    """将现有的 NULL task_names 转换为空数组"""
    Scan = apps.get_model('scan', 'Scan')
    # 使用原生 SQL 更新，因为 Django ORM 对 NULL 数组处理不够好
    schema_editor.execute(
        "UPDATE scan SET task_names = '{}' WHERE task_names IS NULL"
    )


def reverse_migration(apps, schema_editor):
    """回滚时将空数组转换回 NULL（保持数据一致性）"""
    # 回滚时不需要特别处理，因为空数组也是有效值
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('scan', '0003_add_scantask_indexes'),
    ]

    operations = [
        # 第一步：先将现有的 NULL 值转换为空数组
        migrations.RunPython(
            convert_null_to_empty_array,
            reverse_migration
        ),
        
        # 第二步：修改字段定义
        migrations.AlterField(
            model_name='scan',
            name='task_names',
            field=ArrayField(
                models.CharField(max_length=200),
                blank=True,
                default=list,
                help_text='任务列表名称'
            ),
        ),
    ]

