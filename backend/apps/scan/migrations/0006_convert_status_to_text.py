# Generated manually on 2025-11-07
# 将 Scan 和 ScanTask 的 status 字段从 IntegerField 改为 CharField（TextChoices）
# 并将现有的整数状态值转换为字符串状态值

from django.db import migrations, models


def convert_status_integer_to_text(apps, schema_editor):
    """
    将现有的整数状态值转换为字符串状态值
    注意：此函数在字段类型已改为 VARCHAR 后执行
    """
    # 状态映射表：整数 -> 字符串
    # 使用 CASE WHEN 语句一次性完成转换
    sql_scan = """
        UPDATE scan 
        SET status = CASE status::integer
            WHEN -2 THEN 'aborted'
            WHEN -1 THEN 'failed'
            WHEN 0 THEN 'initiated'
            WHEN 1 THEN 'running'
            WHEN 2 THEN 'successful'
            ELSE 'initiated'
        END
    """
    
    sql_scan_task = """
        UPDATE scan_task 
        SET status = CASE status::integer
            WHEN -2 THEN 'aborted'
            WHEN -1 THEN 'failed'
            WHEN 0 THEN 'initiated'
            WHEN 1 THEN 'running'
            WHEN 2 THEN 'successful'
            ELSE 'initiated'
        END
    """
    
    schema_editor.execute(sql_scan)
    schema_editor.execute(sql_scan_task)


def reverse_status_text_to_integer(apps, schema_editor):
    """
    回滚时将字符串状态值转换回整数状态值
    注意：此函数在字段类型回退为 INTEGER 前执行
    """
    # 状态映射表：字符串 -> 整数
    sql_scan = """
        UPDATE scan 
        SET status = CASE status
            WHEN 'aborted' THEN '-2'
            WHEN 'failed' THEN '-1'
            WHEN 'initiated' THEN '0'
            WHEN 'running' THEN '1'
            WHEN 'successful' THEN '2'
            ELSE '0'
        END
    """
    
    sql_scan_task = """
        UPDATE scan_task 
        SET status = CASE status
            WHEN 'aborted' THEN '-2'
            WHEN 'failed' THEN '-1'
            WHEN 'initiated' THEN '0'
            WHEN 'running' THEN '1'
            WHEN 'successful' THEN '2'
            ELSE '0'
        END
    """
    
    schema_editor.execute(sql_scan)
    schema_editor.execute(sql_scan_task)


class Migration(migrations.Migration):

    dependencies = [
        ('scan', '0005_rename_scan_task_scan_task_idx_scan_task_scan_id_edd895_idx_and_more'),
    ]

    operations = [
        # 步骤 1: 先修改 Scan 的 status 字段类型（integer -> varchar）
        migrations.AlterField(
            model_name='scan',
            name='status',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('aborted', '中止'),
                    ('failed', '失败'),
                    ('initiated', '初始化'),
                    ('running', '运行中'),
                    ('successful', '成功')
                ],
                default='initiated',
                db_index=True,
                help_text='任务状态'
            ),
        ),
        
        # 步骤 2: 修改 ScanTask 的 status 字段类型（integer -> varchar）
        migrations.AlterField(
            model_name='scantask',
            name='status',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('aborted', '中止'),
                    ('failed', '失败'),
                    ('initiated', '初始化'),
                    ('running', '运行中'),
                    ('successful', '成功')
                ],
                default='initiated',
                db_index=True,
                help_text='任务状态'
            ),
        ),
        
        # 步骤 3: 转换现有数据（integer 字符串 -> 语义化字符串）
        # PostgreSQL 的 AlterField 会将 integer 转为字符串（如 "1" -> "1"）
        # 我们需要将 "1" 转为 "running"
        migrations.RunPython(
            convert_status_integer_to_text,
            reverse_status_text_to_integer
        ),
    ]
