#!/usr/bin/env python
"""
数据填充脚本

为以下表填充测试数据：
- Target (目标)
- Organization (组织)
- Subdomain (子域名)
- WebSite (网站)
- Directory (目录)
- HostPortMapping (主机端口映射)
- Scan (扫描记录)
- SubdomainSnapshot (子域名快照)
- WebSiteSnapshot (网站快照)
- DirectorySnapshot (目录快照)
"""

import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone

# 设置 Django 环境
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.targets.models import Target, Organization
from apps.asset.models import (
    Subdomain, WebSite, Directory, HostPortMapping
)
from apps.scan.models import Scan
from apps.engine.models import ScanEngine
from apps.asset.models.snapshot_models import (
    SubdomainSnapshot, WebsiteSnapshot, DirectorySnapshot, HostPortMappingSnapshot
)


def clear_existing_data():
    """清空现有数据"""
    print("🗑️  清空现有数据...")
    
    # 按依赖顺序删除
    DirectorySnapshot.objects.all().delete()
    WebsiteSnapshot.objects.all().delete()
    SubdomainSnapshot.objects.all().delete()
    HostPortMappingSnapshot.objects.all().delete()
    
    Directory.objects.all().delete()
    WebSite.objects.all().delete()
    HostPortMapping.objects.all().delete()
    Subdomain.objects.all().delete()
    
    Scan.objects.all().delete()
    Target.objects.all().delete()
    Organization.objects.all().delete()
    
    print("✅ 数据清空完成\n")


def create_organizations():
    """创建组织"""
    print("📁 创建组织...")
    
    orgs = [
        Organization.objects.create(name="技术部", description="技术研发部门"),
        Organization.objects.create(name="安全部", description="信息安全部门"),
        Organization.objects.create(name="运维部", description="系统运维部门"),
    ]
    
    print(f"✅ 创建了 {len(orgs)} 个组织\n")
    return orgs


def create_targets(orgs):
    """创建目标 - 模拟真实企业场景"""
    print("🎯 创建目标...")
    
    targets = [
        Target.objects.create(
            name="acmecorp.com",  # 虚构的 ACME 公司
            type=Target.TargetType.DOMAIN
        ),
        Target.objects.create(
            name="techstart.io",  # 虚构的科技创业公司
            type=Target.TargetType.DOMAIN
        ),
        Target.objects.create(
            name="cloudservices.net",  # 虚构的云服务公司
            type=Target.TargetType.DOMAIN
        ),
    ]
    
    print(f"✅ 创建了 {len(targets)} 个目标\n")
    return targets


def create_scans(targets):
    """创建扫描记录"""
    print("🔍 创建扫描记录...")
    
    # 获取或创建默认扫描引擎
    engine, created = ScanEngine.objects.get_or_create(
        name='default',
        defaults={
            'is_default': True,
            'configuration': ''
        }
    )
    if created:
        print(f"  创建默认扫描引擎: {engine.name}")
    
    scans = []
    for i, target in enumerate(targets):
        # 为每个目标创建 2-3 个扫描记录
        for j in range(2 + i % 2):
            scan = Scan.objects.create(
                target=target,
                engine=engine,
                status='completed' if j == 0 else 'running',
                stopped_at=timezone.now() - timedelta(days=j, hours=-2) if j == 0 else None,
            )
            scans.append(scan)
    
    print(f"✅ 创建了 {len(scans)} 个扫描记录\n")
    return scans


def create_subdomains(targets, scans):
    """创建子域名及快照 - 根据不同公司类型创建真实的子域名"""
    print("🌐 创建子域名...")
    
    # 为不同类型的公司定义真实的子域名
    company_subdomains = {
        'acmecorp.com': [
            'www', 'api', 'admin', 'mail', 'portal',
            'crm', 'erp', 'hr', 'finance', 'docs',
            'vpn', 'git', 'jenkins', 'monitoring'
        ],
        'techstart.io': [
            'www', 'api', 'app', 'blog', 'docs',
            'dev', 'staging', 'cdn', 'assets', 'status',
            'dashboard', 'analytics', 'support'
        ],
        'cloudservices.net': [
            'www', 'api', 'console', 'portal', 'billing',
            'storage', 'compute', 'database', 'cdn', 'monitoring',
            'status', 'docs', 'support', 'marketplace'
        ],
    }
    
    subdomains = []
    snapshots = []
    
    for target in targets:
        # 获取该公司的子域名列表
        subdomain_list = company_subdomains.get(target.name, ['www', 'api', 'admin'])
        
        # 为每个目标创建所有子域名
        for name in subdomain_list:
            full_name = f"{name}.{target.name}"
            subdomain = Subdomain.objects.create(
                target=target,
                name=full_name,
            )
            subdomains.append(subdomain)
            
            # 为子域名创建快照（关联到最新的扫描）
            latest_scan = next((s for s in scans if s.target == target and s.status == 'completed'), None)
            if latest_scan:
                snapshot = SubdomainSnapshot.objects.create(
                    name=full_name,
                    scan=latest_scan,
                )
                snapshots.append(snapshot)
    
    print(f"✅ 创建了 {len(subdomains)} 个子域名")
    print(f"✅ 创建了 {len(snapshots)} 个子域名快照\n")
    return subdomains


def create_host_port_mappings(targets, subdomains, scans):
    """创建主机端口映射及快照 - 真实的服务与端口映射关系，一个 IP 对应多个域名"""
    print("🔌 创建主机端口映射...")
    
    # 定义真实的服务与端口映射关系（扩展端口列表）
    service_ports = {
        'www': [80, 443, 8080, 8443],  # Web 服务
        'api': [443, 8080, 8443, 3000, 5000, 8000],  # API 服务
        'app': [443, 8443, 3000, 3001, 4000],  # 应用服务
        'admin': [443, 8443, 9000, 9001],  # 管理后台
        'mail': [25, 110, 143, 465, 587, 993, 995, 2525],  # 邮件服务
        'portal': [443, 8443, 9443],  # 门户
        'crm': [443, 8080, 8443, 9000],  # CRM 系统
        'erp': [443, 8080, 8443, 9000, 9001],  # ERP 系统
        'hr': [443, 8443, 9000],  # HR 系统
        'finance': [443, 8443, 9000, 9443],  # 财务系统
        'docs': [443, 8080, 3000],  # 文档系统
        'blog': [80, 443, 8080, 8443],  # 博客
        'vpn': [443, 1194, 1195, 1196, 1197],  # VPN 服务
        'git': [22, 443, 9418, 3000, 8080],  # Git 服务
        'jenkins': [8080, 443, 50000, 8443],  # CI/CD
        'monitoring': [443, 3000, 9090, 9091, 9093, 9100, 9115],  # 监控服务
        'dev': [80, 443, 3000, 3001, 5000, 8080, 8443],  # 开发环境
        'staging': [80, 443, 8080, 8443, 3000],  # 预发布环境
        'cdn': [80, 443, 8080, 8443],  # CDN
        'assets': [80, 443, 8080, 8443],  # 静态资源
        'status': [443, 8080, 3000],  # 状态页
        'dashboard': [443, 3000, 3001, 8080, 8443],  # 仪表板
        'analytics': [443, 8080, 9000],  # 分析服务
        'support': [443, 8080, 8443],  # 支持系统
        'console': [443, 8080, 8443, 9000],  # 控制台
        'billing': [443, 8080, 8443, 9000],  # 计费系统
        'storage': [443, 9000, 9001, 9002, 9003],  # 存储服务
        'compute': [443, 8080, 8443],  # 计算服务
        'database': [3306, 5432, 27017, 6379, 5433, 27018, 6380],  # 数据库服务
        'marketplace': [443, 8080, 8443],  # 市场
    }
    
    # 为不同公司分配不同的 IP 段
    company_ip_ranges = {
        'acmecorp.com': '10.0.1.',
        'techstart.io': '10.0.2.',
        'cloudservices.net': '10.0.3.',
    }
    
    mappings = []
    
    for target in targets:
        target_subdomains = [s for s in subdomains if s.target == target]
        ip_base = company_ip_ranges.get(target.name, '192.168.1.')
        
        # 策略：让多个子域名共享同一个 IP
        # 每 5-6 个子域名共享一个 IP
        ip_groups = {}
        for i, subdomain in enumerate(target_subdomains):
            # 每 5 个子域名使用同一个 IP
            ip_index = i // 5
            ip = f"{ip_base}{10 + ip_index}"
            
            if ip not in ip_groups:
                ip_groups[ip] = []
            ip_groups[ip].append(subdomain)
        
        # 为每个 IP 组创建映射
        for ip, group_subdomains in ip_groups.items():
            # 收集该 IP 组所有子域名需要的端口
            all_ports = set()
            
            for subdomain in group_subdomains:
                subdomain_prefix = subdomain.name.split('.')[0]
                ports = service_ports.get(subdomain_prefix, [80, 443])
                all_ports.update(ports)
            
            # 为该 IP 的每个子域名创建所有端口的映射
            for subdomain in group_subdomains:
                for port in all_ports:
                    mapping = HostPortMapping.objects.create(
                        target=target,
                        host=subdomain.name,
                        ip=ip,
                        port=port,
                    )
                    mappings.append(mapping)
    
    print(f"✅ 创建了 {len(mappings)} 个主机端口映射")
    
    # 为已完成的扫描创建快照
    snapshots = []
    for target in targets:
        target_subdomains = [s for s in subdomains if s.target == target]
        ip_base = company_ip_ranges.get(target.name, '192.168.1.')
        latest_scan = next((s for s in scans if s.target == target and s.status == 'completed'), None)
        
        if latest_scan:
            # 重新构建 IP 组
            ip_groups = {}
            for i, subdomain in enumerate(target_subdomains):
                ip_index = i // 5
                ip = f"{ip_base}{10 + ip_index}"
                if ip not in ip_groups:
                    ip_groups[ip] = []
                ip_groups[ip].append(subdomain)
            
            # 为每个 IP 组创建快照映射
            for ip, group_subdomains in ip_groups.items():
                all_ports = set()
                for subdomain in group_subdomains:
                    subdomain_prefix = subdomain.name.split('.')[0]
                    ports = service_ports.get(subdomain_prefix, [80, 443])
                    all_ports.update(ports)
                
                for subdomain in group_subdomains:
                    for port in all_ports:
                        snapshot = HostPortMappingSnapshot.objects.create(
                            scan=latest_scan,
                            host=subdomain.name,
                            ip=ip,
                            port=port,
                        )
                        snapshots.append(snapshot)
    
    print(f"✅ 创建了 {len(snapshots)} 个主机端口映射快照\n")
    return mappings


def create_websites(targets, subdomains, scans):
    """创建网站及快照 - 填充所有字段的真实数据"""
    print("🌍 创建网站...")
    
    # 定义真实的网站信息（包含所有字段）
    website_info = {
        'www': {
            'title': '首页 - {}',
            'status': 200,
            'server': 'nginx/1.24.0',
            'tech': ['React', 'Next.js', 'TailwindCSS'],
            'content_type': 'text/html; charset=utf-8',
            'location': '',
            'body_preview': '<!DOCTYPE html><html><head><title>Welcome</title></head><body><h1>Welcome to our website</h1>',
            'vhost': True,
            'protocols': ['https']
        },
        'api': {
            'title': 'API Documentation - {}',
            'status': 200,
            'server': 'nginx/1.24.0',
            'tech': ['FastAPI', 'Python', 'PostgreSQL', 'Redis'],
            'content_type': 'application/json',
            'location': '',
            'body_preview': '{"status":"ok","version":"1.0.0","endpoints":["/users","/products","/orders"]}',
            'vhost': True,
            'protocols': ['https']
        },
        'app': {
            'title': 'Application Portal - {}',
            'status': 200,
            'server': 'nginx/1.24.0',
            'tech': ['Vue.js', 'Element UI', 'Axios'],
            'content_type': 'text/html; charset=utf-8',
            'location': '',
            'body_preview': '<!DOCTYPE html><html><head><title>App</title></head><body><div id="app">Loading...</div>',
            'vhost': True,
            'protocols': ['https']
        },
        'admin': {
            'title': 'Admin Dashboard - {}',
            'status': 403,
            'server': 'nginx/1.24.0',
            'tech': ['Django', 'Bootstrap', 'jQuery'],
            'content_type': 'text/html; charset=utf-8',
            'location': '/login',
            'body_preview': '<html><head><title>403 Forbidden</title></head><body><h1>Access Denied</h1></body></html>',
            'vhost': True,
            'protocols': ['https']
        },
        'blog': {
            'title': 'Tech Blog - {}',
            'status': 200,
            'server': 'Apache/2.4.57',
            'tech': ['WordPress', 'PHP', 'MySQL'],
            'content_type': 'text/html; charset=utf-8',
            'location': '',
            'body_preview': '<!DOCTYPE html><html><head><title>Blog</title></head><body><article><h1>Latest Posts</h1>',
            'vhost': False,
            'protocols': ['http', 'https']
        },
        'docs': {
            'title': 'Documentation - {}',
            'status': 200,
            'server': 'nginx/1.24.0',
            'tech': ['VuePress', 'Markdown', 'Node.js'],
            'content_type': 'text/html; charset=utf-8',
            'location': '',
            'body_preview': '<!DOCTYPE html><html><head><title>Docs</title></head><body><nav>Getting Started</nav>',
            'vhost': True,
            'protocols': ['https']
        },
        'portal': {
            'title': 'Enterprise Portal - {}',
            'status': 301,
            'server': 'nginx/1.24.0',
            'tech': ['Angular', 'TypeScript', 'RxJS'],
            'content_type': 'text/html; charset=utf-8',
            'location': 'https://portal.example.com/dashboard',
            'body_preview': '<html><head><title>Redirecting...</title></head><body>Redirecting to dashboard...</body></html>',
            'vhost': True,
            'protocols': ['https']
        },
        'crm': {
            'title': 'CRM System - {}',
            'status': 200,
            'server': 'Apache/2.4.57',
            'tech': ['Java', 'Spring Boot', 'MySQL', 'Redis'],
            'content_type': 'text/html; charset=utf-8',
            'location': '',
            'body_preview': '<!DOCTYPE html><html><head><title>CRM</title></head><body><div class="container">Dashboard</div>',
            'vhost': True,
            'protocols': ['https']
        },
        'erp': {
            'title': 'ERP System - {}',
            'status': 200,
            'server': 'IIS/10.0',
            'tech': ['.NET Core', 'SQL Server', 'SignalR'],
            'content_type': 'text/html; charset=utf-8',
            'location': '',
            'body_preview': '<!DOCTYPE html><html><head><title>ERP</title></head><body><main>Enterprise Resource Planning</main>',
            'vhost': True,
            'protocols': ['https']
        },
        'jenkins': {
            'title': 'Jenkins CI/CD - {}',
            'status': 200,
            'server': 'Jetty/9.4.51',
            'tech': ['Jenkins', 'Java', 'Groovy'],
            'content_type': 'text/html; charset=utf-8',
            'location': '',
            'body_preview': '<!DOCTYPE html><html><head><title>Jenkins</title></head><body><div id="jenkins">Build Pipeline</div>',
            'vhost': False,
            'protocols': ['https']
        },
        'monitoring': {
            'title': 'System Monitoring - {}',
            'status': 200,
            'server': 'nginx/1.24.0',
            'tech': ['Grafana', 'Prometheus', 'InfluxDB'],
            'content_type': 'text/html; charset=utf-8',
            'location': '',
            'body_preview': '<!DOCTYPE html><html><head><title>Monitoring</title></head><body><div class="grafana">Metrics Dashboard</div>',
            'vhost': True,
            'protocols': ['https']
        },
        'console': {
            'title': 'Cloud Console - {}',
            'status': 200,
            'server': 'nginx/1.24.0',
            'tech': ['React', 'Ant Design', 'TypeScript'],
            'content_type': 'text/html; charset=utf-8',
            'location': '',
            'body_preview': '<!DOCTYPE html><html><head><title>Console</title></head><body><div id="root">Cloud Management</div>',
            'vhost': True,
            'protocols': ['https']
        },
        'status': {
            'title': 'System Status - {}',
            'status': 200,
            'server': 'nginx/1.24.0',
            'tech': ['Statuspage', 'React', 'Chart.js'],
            'content_type': 'text/html; charset=utf-8',
            'location': '',
            'body_preview': '<!DOCTYPE html><html><head><title>Status</title></head><body><div class="status">All Systems Operational</div>',
            'vhost': True,
            'protocols': ['https']
        },
    }
    
    websites = []
    snapshots = []
    
    for target in targets:
        target_subdomains = [s for s in subdomains if s.target == target]
        
        # 为每个子域名创建网站
        for subdomain in target_subdomains:
            subdomain_prefix = subdomain.name.split('.')[0]
            info = website_info.get(subdomain_prefix, {
                'title': f'{subdomain_prefix.title()} - {{}}',
                'status': 200,
                'server': 'nginx/1.24.0',
                'tech': ['Unknown'],
                'content_type': 'text/html; charset=utf-8',
                'location': '',
                'body_preview': f'<!DOCTYPE html><html><head><title>{subdomain_prefix}</title></head><body>Content</body></html>',
                'vhost': True,
                'protocols': ['https']
            })
            
            # 根据配置创建 HTTP/HTTPS 网站
            for protocol in info['protocols']:
                url = f"{protocol}://{subdomain.name}"
                company_name = target.name.split('.')[0].title()
                
                website = WebSite.objects.create(
                    target=target,
                    subdomain=subdomain,
                    url=url,
                    title=info['title'].format(company_name),
                    webserver=info['server'],
                    content_type=info['content_type'],
                    status_code=info['status'],
                    content_length=2048 + len(info['tech']) * 512,
                    tech=info['tech'],
                    location=info['location'],
                    body_preview=info['body_preview'],
                    vhost=info['vhost'],
                )
                websites.append(website)
                
                # 创建网站快照
                latest_scan = next((s for s in scans if s.target == target and s.status == 'completed'), None)
                if latest_scan:
                    snapshot = WebsiteSnapshot.objects.create(
                        subdomain=subdomain,
                        scan=latest_scan,
                        url=url,
                        status=info['status'],
                        title=info['title'].format(company_name),
                        content_length=2048 + len(info['tech']) * 512,
                        web_server=info['server'],
                        tech=info['tech'],
                        location=info['location'],
                        body_preview=info['body_preview'],
                        vhost=info['vhost'],
                        content_type=info['content_type'],
                    )
                    snapshots.append(snapshot)
    
    print(f"✅ 创建了 {len(websites)} 个网站")
    print(f"✅ 创建了 {len(snapshots)} 个网站快照\n")
    return websites


def create_directories(targets, websites, scans):
    """创建目录及快照 - 填充所有字段的真实数据"""
    print("📂 创建目录...")
    
    # 为不同类型的网站定义真实的目录结构（包含详细信息）
    service_directories = {
        'www': [
            {'path': '/', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 500, 'lines': 120},
            {'path': '/about', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 350, 'lines': 80},
            {'path': '/contact', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 200, 'lines': 50},
            {'path': '/products', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 800, 'lines': 200},
            {'path': '/services', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 600, 'lines': 150},
            {'path': '/blog', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 1000, 'lines': 250},
            {'path': '/news', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 700, 'lines': 180},
            {'path': '/careers', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 400, 'lines': 100},
            {'path': '/support', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 300, 'lines': 75},
            {'path': '/login', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 150, 'lines': 40},
            {'path': '/static/css', 'status': 404, 'content_type': 'text/html', 'words': 50, 'lines': 10},
            {'path': '/static/js', 'status': 404, 'content_type': 'text/html', 'words': 50, 'lines': 10},
            {'path': '/static/images', 'status': 404, 'content_type': 'text/html', 'words': 50, 'lines': 10},
            {'path': '/assets', 'status': 403, 'content_type': 'text/html', 'words': 30, 'lines': 8},
        ],
        'api': [
            {'path': '/v1', 'status': 200, 'content_type': 'application/json', 'words': 50, 'lines': 10},
            {'path': '/v2', 'status': 200, 'content_type': 'application/json', 'words': 50, 'lines': 10},
            {'path': '/docs', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 2000, 'lines': 500},
            {'path': '/swagger', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 1500, 'lines': 400},
            {'path': '/health', 'status': 200, 'content_type': 'application/json', 'words': 10, 'lines': 3},
            {'path': '/v1/users', 'status': 200, 'content_type': 'application/json', 'words': 200, 'lines': 50},
            {'path': '/v1/products', 'status': 200, 'content_type': 'application/json', 'words': 300, 'lines': 80},
            {'path': '/v1/orders', 'status': 200, 'content_type': 'application/json', 'words': 250, 'lines': 60},
            {'path': '/v1/auth', 'status': 401, 'content_type': 'application/json', 'words': 20, 'lines': 5},
            {'path': '/v2/users', 'status': 200, 'content_type': 'application/json', 'words': 220, 'lines': 55},
            {'path': '/v2/products', 'status': 200, 'content_type': 'application/json', 'words': 320, 'lines': 85},
            {'path': '/v2/analytics', 'status': 200, 'content_type': 'application/json', 'words': 400, 'lines': 100},
        ],
        'admin': [
            {'path': '/', 'status': 403, 'content_type': 'text/html; charset=utf-8', 'words': 100, 'lines': 20},
            {'path': '/login', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 150, 'lines': 35},
            {'path': '/dashboard', 'status': 403, 'content_type': 'text/html; charset=utf-8', 'words': 100, 'lines': 20},
            {'path': '/users', 'status': 403, 'content_type': 'text/html; charset=utf-8', 'words': 100, 'lines': 20},
            {'path': '/settings', 'status': 403, 'content_type': 'text/html; charset=utf-8', 'words': 100, 'lines': 20},
            {'path': '/logs', 'status': 403, 'content_type': 'text/html; charset=utf-8', 'words': 100, 'lines': 20},
            {'path': '/monitoring', 'status': 403, 'content_type': 'text/html; charset=utf-8', 'words': 100, 'lines': 20},
            {'path': '/reports', 'status': 403, 'content_type': 'text/html; charset=utf-8', 'words': 100, 'lines': 20},
            {'path': '/system', 'status': 403, 'content_type': 'text/html; charset=utf-8', 'words': 100, 'lines': 20},
        ],
    }
    
    directories = []
    snapshots = []
    
    for target in targets:
        target_websites = [w for w in websites if w.target == target]
        
        # 为每个网站创建目录
        for website in target_websites:
            # 提取服务类型
            subdomain_prefix = website.subdomain.name.split('.')[0]
            paths = service_directories.get(subdomain_prefix, [
                {'path': '/', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 300, 'lines': 80},
                {'path': '/login', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 150, 'lines': 40},
                {'path': '/dashboard', 'status': 200, 'content_type': 'text/html; charset=utf-8', 'words': 500, 'lines': 120},
                {'path': '/api', 'status': 200, 'content_type': 'application/json', 'words': 100, 'lines': 25},
                {'path': '/static', 'status': 404, 'content_type': 'text/html', 'words': 50, 'lines': 10},
            ])
            
            # 为该网站创建所有相关目录
            for dir_info in paths:
                url = f"{website.url}{dir_info['path']}"
                
                # 计算内容长度（基于 words）
                content_length = dir_info['words'] * 6  # 平均每个单词6字节
                # 计算请求耗时（纳秒）
                duration = 50000000 + (dir_info['words'] * 10000)  # 50ms + 每个单词10微秒
                
                directory = Directory.objects.create(
                    target=target,
                    website=website,
                    url=url,
                    status=dir_info['status'],
                    content_length=content_length,
                    words=dir_info['words'],
                    lines=dir_info['lines'],
                    content_type=dir_info['content_type'],
                    duration=duration,
                )
                directories.append(directory)
                
                # 创建目录快照（填充所有字段）
                latest_scan = next((s for s in scans if s.target == target and s.status == 'completed'), None)
                if latest_scan:
                    snapshot = DirectorySnapshot.objects.create(
                        website=website,
                        scan=latest_scan,
                        url=url,
                        status=dir_info['status'],
                        content_length=content_length,
                        words=dir_info['words'],
                        lines=dir_info['lines'],
                        content_type=dir_info['content_type'],
                        duration=duration,
                    )
                    snapshots.append(snapshot)
    
    print(f"✅ 创建了 {len(directories)} 个目录")
    print(f"✅ 创建了 {len(snapshots)} 个目录快照\n")
    return directories


def update_scan_stats(scans):
    """更新扫描统计数据（使用 ScanService 更新缓存字段）"""
    print("📊 更新扫描统计...")
    
    from apps.scan.services import ScanService
    scan_service = ScanService()
    
    for scan in scans:
        if scan.status == 'completed':
            # 使用 ScanService 更新缓存统计字段
            scan_service.update_cached_stats(scan.id)
    
    print("✅ 扫描统计更新完成\n")


def main():
    """主函数"""
    print("\n" + "="*50)
    print("  XingRin 数据填充脚本")
    print("="*50 + "\n")
    
    try:
        # 清空现有数据
        clear_existing_data()
        
        # 创建数据
        orgs = create_organizations()
        targets = create_targets(orgs)
        scans = create_scans(targets)
        subdomains = create_subdomains(targets, scans)
        mappings = create_host_port_mappings(targets, subdomains, scans)
        websites = create_websites(targets, subdomains, scans)
        directories = create_directories(targets, websites, scans)
        
        # 更新统计
        update_scan_stats(scans)
        
        # 打印总结
        print("="*50)
        print("  ✅ 数据填充完成！")
        print("="*50)
        print(f"\n📊 数据统计：")
        print(f"  - 组织: {Organization.objects.count()}")
        print(f"  - 目标: {Target.objects.count()}")
        print(f"  - 扫描记录: {Scan.objects.count()}")
        print(f"  - 子域名: {Subdomain.objects.count()}")
        print(f"  - 子域名快照: {SubdomainSnapshot.objects.count()}")
        print(f"  - 主机端口映射: {HostPortMapping.objects.count()}")
        print(f"  - 主机端口映射快照: {HostPortMappingSnapshot.objects.count()}")
        print(f"  - 网站: {WebSite.objects.count()}")
        print(f"  - 网站快照: {WebsiteSnapshot.objects.count()}")
        print(f"  - 目录: {Directory.objects.count()}")
        print(f"  - 目录快照: {DirectorySnapshot.objects.count()}")
        print("\n🎉 可以开始测试了！\n")
        
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
