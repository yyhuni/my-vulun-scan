from django.db import models

class Organization(models.Model):
	id = models.AutoField(primary_key=True)
	name = models.CharField(max_length=300, unique=True, help_text='组织名称')
	description = models.TextField(blank=True, null=True, help_text='组织描述')
	created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')
	domains = models.ManyToManyField('Domain', related_name='organizations', blank=True, help_text='所属域名列表')

	def __str__(self):
		return self.name


class Domain(models.Model):
	id = models.AutoField(primary_key=True)
	name = models.CharField(max_length=300, unique=True, help_text='域名名称')
	ip_address_cidr = models.CharField(max_length=100, blank=True, null=True, help_text='IP地址或CIDR范围')
	description = models.TextField(blank=True, null=True, help_text='域名描述')
	created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')
	scan_started_at = models.DateTimeField(null=True, blank=True, help_text='开始扫描时间')
	request_headers = models.JSONField(null=True, blank=True, help_text='请求头配置')

	def __str__(self):
		return str(self.name)
