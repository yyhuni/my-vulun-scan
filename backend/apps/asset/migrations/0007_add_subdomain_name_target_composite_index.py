# Generated manually on 2025-11-12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('asset', '0006_port_subdomain_alter_endpoint_target_and_more'),
    ]

    operations = [
        # 添加复合索引：(name, target_id)
        # 用于优化批量查询：WHERE name IN (...) AND target_id = ?
        migrations.AddIndex(
            model_name='subdomain',
            index=models.Index(fields=['name', 'target_id'], name='subdomain_name_target_idx'),
        ),
        
        # 删除单独的 name 索引（复合索引的左前缀可以覆盖单字段查询）
        # 原索引名来自 0002_initial.py
        migrations.RemoveIndex(
            model_name='subdomain',
            name='subdomain_name_d40ba7_idx',
        ),
    ]
