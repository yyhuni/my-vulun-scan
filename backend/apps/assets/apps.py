from django.apps import AppConfig


class AssetsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.assets'  # ⚠️ 因为应用在 apps/ 目录下，必须加前缀
