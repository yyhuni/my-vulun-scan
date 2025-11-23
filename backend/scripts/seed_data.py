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
    SubdomainSnapshot, WebsiteSnapshot, DirectorySnapshot
)


def clear_existing_data():
    """清空现有数据"""
    print("🗑️  清空现有数据...")
    
    # 按依赖顺序删除
    DirectorySnapshot.objects.all().delete()
    WebsiteSnapshot.objects.all().delete()
    SubdomainSnapshot.objects.all().delete()
    
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


def create_host_port_mappings(targets, subdomains):
    """创建主机端口映射 - 真实的服务与端口映射关系"""
    print("🔌 创建主机端口映射...")
    
    # 定义真实的服务与端口映射关系
    service_ports = {
        'www': [80, 443],  # Web 服务
        'api': [443, 8080],  # API 服务
        'app': [443, 8443],  # 应用服务
        'admin': [443, 8443],  # 管理后台
        'mail': [25, 587, 993, 995],  # 邮件服务
        'portal': [443],  # 门户
        'crm': [443, 8443],  # CRM 系统
        'erp': [443, 8443],  # ERP 系统
        'hr': [443],  # HR 系统
        'finance': [443],  # 财务系统
        'docs': [443],  # 文档系统
        'blog': [80, 443],  # 博客
        'vpn': [443, 1194],  # VPN 服务
        'git': [22, 443, 9418],  # Git 服务
        'jenkins': [8080, 443],  # CI/CD
        'monitoring': [443, 9090, 3000],  # 监控服务
        'dev': [80, 443, 3000],  # 开发环境
        'staging': [80, 443],  # 预发布环境
        'cdn': [80, 443],  # CDN
        'assets': [80, 443],  # 静态资源
        'status': [443],  # 状态页
        'dashboard': [443, 3000],  # 仪表板
        'analytics': [443],  # 分析服务
        'support': [443],  # 支持系统
        'console': [443],  # 控制台
        'billing': [443],  # 计费系统
        'storage': [443, 9000],  # 存储服务
        'compute': [443],  # 计算服务
        'database': [3306, 5432, 27017],  # 数据库服务
        'marketplace': [443],  # 市场
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
        
        # 为每个子域名创建 IP 和端口映射
        for i, subdomain in enumerate(target_subdomains):
            # 提取子域名前缀
            subdomain_prefix = subdomain.name.split('.')[0]
            
            # 根据服务类型分配 IP（同一服务可能在不同 IP 上）
            ip = f"{ip_base}{10 + i}"
            
            # 根据服务类型获取对应的端口
            ports = service_ports.get(subdomain_prefix, [80, 443])
            
            # 为该子域名创建所有相关端口的映射
            for port in ports:
                mapping = HostPortMapping.objects.create(
                    target=target,
                    host=subdomain.name,
                    ip=ip,
                    port=port,
                )
                mappings.append(mapping)
    
    print(f"✅ 创建了 {len(mappings)} 个主机端口映射\n")
    return mappings


def create_websites(targets, subdomains, scans):
    """创建网站及快照 - 真实的网站标题和技术栈"""
    print("🌍 创建网站...")
    
    # 定义真实的网站信息
    website_info = {
        'www': {
            'title': '首页 - {}',
            'status': 200,
            'server': 'nginx/1.24.0',
            'tech': ['React', 'Next.js', 'TailwindCSS'],
            'protocols': ['https']
        },
        'api': {
            'title': 'API Documentation - {}',
            'status': 200,
            'server': 'nginx/1.24.0',
            'tech': ['FastAPI', 'Python', 'PostgreSQL', 'Redis'],
            'protocols': ['https']
        },
        'app': {
            'title': 'Application Portal - {}',
            'status': 200,
            'server': 'nginx/1.24.0',
            'tech': ['Vue.js', 'Element UI', 'Axios'],
            'protocols': ['https']
        },
        'admin': {
            'title': 'Admin Dashboard - {}',
            'status': 403,
            'server': 'nginx/1.24.0',
            'tech': ['Django', 'Bootstrap', 'jQuery'],
            'protocols': ['https']
        },
        'blog': {
            'title': 'Tech Blog - {}',
            'status': 200,
            'server': 'Apache/2.4.57',
            'tech': ['WordPress', 'PHP', 'MySQL'],
            'protocols': ['http', 'https']
        },
        'docs': {
            'title': 'Documentation - {}',
            'status': 200,
            'server': 'nginx/1.24.0',
            'tech': ['VuePress', 'Markdown', 'Node.js'],
            'protocols': ['https']
        },
        'portal': {
            'title': 'Enterprise Portal - {}',
            'status': 200,
            'server': 'nginx/1.24.0',
            'tech': ['Angular', 'TypeScript', 'RxJS'],
            'protocols': ['https']
        },
        'crm': {
            'title': 'CRM System - {}',
            'status': 200,
            'server': 'Apache/2.4.57',
            'tech': ['Java', 'Spring Boot', 'MySQL', 'Redis'],
            'protocols': ['https']
        },
        'erp': {
            'title': 'ERP System - {}',
            'status': 200,
            'server': 'IIS/10.0',
            'tech': ['.NET Core', 'SQL Server', 'SignalR'],
            'protocols': ['https']
        },
        'jenkins': {
            'title': 'Jenkins CI/CD - {}',
            'status': 200,
            'server': 'Jetty/9.4.51',
            'tech': ['Jenkins', 'Java', 'Groovy'],
            'protocols': ['https']
        },
        'monitoring': {
            'title': 'System Monitoring - {}',
            'status': 200,
            'server': 'nginx/1.24.0',
            'tech': ['Grafana', 'Prometheus', 'InfluxDB'],
            'protocols': ['https']
        },
        'console': {
            'title': 'Cloud Console - {}',
            'status': 200,
            'server': 'nginx/1.24.0',
            'tech': ['React', 'Ant Design', 'TypeScript'],
            'protocols': ['https']
        },
        'status': {
            'title': 'System Status - {}',
            'status': 200,
            'server': 'nginx/1.24.0',
            'tech': ['Statuspage', 'React', 'Chart.js'],
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
                'protocols': ['https']
            })
            
            # 根据配置创建 HTTP/HTTPS 网站
            for protocol in info['protocols']:
                url = f"{protocol}://{subdomain.name}"
                website = WebSite.objects.create(
                    target=target,
                    subdomain=subdomain,
                    url=url,
                )
                websites.append(website)
                
                # 创建网站快照
                latest_scan = next((s for s in scans if s.target == target and s.status == 'completed'), None)
                if latest_scan:
                    company_name = target.name.split('.')[0].title()
                    snapshot = WebsiteSnapshot.objects.create(
                        subdomain=subdomain,
                        scan=latest_scan,
                        url=url,
                        status=info['status'],
                        title=info['title'].format(company_name),
                        content_length=2048 + len(info['tech']) * 512,
                        web_server=info['server'],
                        tech=info['tech'],
                    )
                    snapshots.append(snapshot)
    
    print(f"✅ 创建了 {len(websites)} 个网站")
    print(f"✅ 创建了 {len(snapshots)} 个网站快照\n")
    return websites


def create_directories(targets, websites, scans):
    """创建目录及快照 - 真实的、与服务类型相关的目录路径"""
    print("📂 创建目录...")
    
    # 为不同类型的网站定义真实的目录结构
    service_directories = {
        'www': [
            '/', '/about', '/contact', '/products', '/services',
            '/blog', '/news', '/careers', '/support', '/login',
            '/static/css', '/static/js', '/static/images', '/assets'
        ],
        'api': [
            '/v1', '/v2', '/docs', '/swagger', '/health',
            '/v1/users', '/v1/products', '/v1/orders', '/v1/auth',
            '/v2/users', '/v2/products', '/v2/analytics'
        ],
        'app': [
            '/', '/login', '/dashboard', '/profile', '/settings',
            '/notifications', '/messages', '/reports', '/analytics'
        ],
        'admin': [
            '/', '/login', '/dashboard', '/users', '/settings',
            '/logs', '/monitoring', '/reports', '/system'
        ],
        'blog': [
            '/', '/posts', '/categories', '/tags', '/archives',
            '/wp-admin', '/wp-content', '/wp-includes'
        ],
        'docs': [
            '/', '/getting-started', '/api-reference', '/guides',
            '/tutorials', '/faq', '/changelog', '/search'
        ],
        'portal': [
            '/', '/login', '/dashboard', '/projects', '/tasks',
            '/calendar', '/documents', '/team', '/settings'
        ],
        'crm': [
            '/', '/login', '/customers', '/leads', '/opportunities',
            '/contacts', '/reports', '/dashboard', '/settings'
        ],
        'erp': [
            '/', '/login', '/inventory', '/orders', '/finance',
            '/hr', '/production', '/reports', '/settings'
        ],
        'jenkins': [
            '/', '/login', '/job', '/build', '/configure',
            '/api', '/pluginManager', '/systemInfo'
        ],
        'monitoring': [
            '/', '/login', '/dashboards', '/alerts', '/metrics',
            '/logs', '/api', '/datasources', '/plugins'
        ],
        'console': [
            '/', '/login', '/dashboard', '/instances', '/storage',
            '/network', '/security', '/billing', '/settings'
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
                '/', '/login', '/dashboard', '/api', '/static'
            ])
            
            # 为该网站创建所有相关目录
            for path in paths:
                url = f"{website.url}{path}"
                directory = Directory.objects.create(
                    target=target,
                    website=website,
                    url=url,
                )
                directories.append(directory)
                
                # 创建目录快照
                latest_scan = next((s for s in scans if s.target == target and s.status == 'completed'), None)
                if latest_scan:
                    # 根据路径类型设置状态码
                    if 'admin' in path or 'login' in path:
                        status = 403 if 'admin' in subdomain_prefix else 200
                    elif path == '/':
                        status = 200
                    elif 'api' in path:
                        status = 200
                    else:
                        status = 200
                    
                    snapshot = DirectorySnapshot.objects.create(
                        website=website,
                        scan=latest_scan,
                        url=url,
                        status=status,
                        content_length=1024 + len(path) * 100,
                    )
                    snapshots.append(snapshot)
    
    print(f"✅ 创建了 {len(directories)} 个目录")
    print(f"✅ 创建了 {len(snapshots)} 个目录快照\n")
    return directories


def update_scan_stats(scans):
    """更新扫描统计数据"""
    print("📊 更新扫描统计...")
    
    for scan in scans:
        if scan.status == 'completed':
            scan.subdomains_count = Subdomain.objects.filter(target=scan.target).count()
            scan.websites_count = WebSite.objects.filter(target=scan.target).count()
            scan.directories_count = Directory.objects.filter(target=scan.target).count()
            scan.ips_count = HostPortMapping.objects.filter(target=scan.target).values('ip').distinct().count()
            scan.save()
    
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
        mappings = create_host_port_mappings(targets, subdomains)
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
