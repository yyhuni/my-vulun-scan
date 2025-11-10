# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('asset', '0003_migrate_to_array_fields'),
    ]

    operations = [
        # 1. 删除旧的唯一约束
        migrations.RemoveConstraint(
            model_name='subdomain',
            name='unique_subdomain_per_target',
        ),
        
        # 2. 添加新的唯一约束（包含 scan_id）
        migrations.AddConstraint(
            model_name='subdomain',
            constraint=models.UniqueConstraint(
                fields=['name', 'target_id', 'scan_id'],
                name='unique_subdomain_per_scan'
            ),
        ),
    ]
