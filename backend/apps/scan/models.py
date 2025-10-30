from django.db import models

class ScanHistory(models.Model):
	id = models.AutoField(primary_key=True)
	start_scan_at = models.DateTimeField()
