# Generated manually

from django.db import migrations


def forward_migration(apps, schema_editor):
    """将状态值重命名以对齐 Prefect 术语"""
    db_alias = schema_editor.connection.alias
    
    # 更新 Scan 模型的状态
    apps.get_model('scan', 'Scan').objects.using(db_alias).filter(
        status='successful'
    ).update(status='completed')
    
    apps.get_model('scan', 'Scan').objects.using(db_alias).filter(
        status='aborted'
    ).update(status='cancelled')
    
    # 更新 ScanTask 模型的状态
    apps.get_model('scan', 'ScanTask').objects.using(db_alias).filter(
        status='successful'
    ).update(status='completed')
    
    apps.get_model('scan', 'ScanTask').objects.using(db_alias).filter(
        status='aborted'
    ).update(status='cancelled')


def reverse_migration(apps, schema_editor):
    """回滚：将状态值改回原来的名称"""
    db_alias = schema_editor.connection.alias
    
    # 回滚 Scan 模型的状态
    apps.get_model('scan', 'Scan').objects.using(db_alias).filter(
        status='completed'
    ).update(status='successful')
    
    apps.get_model('scan', 'Scan').objects.using(db_alias).filter(
        status='cancelled'
    ).update(status='aborted')
    
    # 回滚 ScanTask 模型的状态
    apps.get_model('scan', 'ScanTask').objects.using(db_alias).filter(
        status='completed'
    ).update(status='successful')
    
    apps.get_model('scan', 'ScanTask').objects.using(db_alias).filter(
        status='cancelled'
    ).update(status='aborted')


class Migration(migrations.Migration):

    dependencies = [
        ('scan', '0007_rename_task_fields_to_flow_run'),
    ]

    operations = [
        migrations.RunPython(forward_migration, reverse_migration),
    ]
