# Generated manually for WeCom notification support

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scan', '0002_add_cached_screenshots_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='notificationsettings',
            name='wecom_enabled',
            field=models.BooleanField(default=False, help_text='是否启用企业微信通知'),
        ),
        migrations.AddField(
            model_name='notificationsettings',
            name='wecom_webhook_url',
            field=models.URLField(blank=True, default='', help_text='企业微信机器人 Webhook URL'),
        ),
    ]
