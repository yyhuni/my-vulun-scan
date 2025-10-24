#!/usr/bin/env python
import os
import sys
import django
import requests
from datetime import datetime

# 添加 backend 目录到 Python 路径
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.assets.models import Asset, Domain, Endpoint
from apps.common.models import Organization

BASE_URL = "http://localhost:8888/api"
TIMESTAMP = int(datetime.now().timestamp())

def create_test_data():
    print("\n" + "="*50)
    print("  XingRin 测试数据生成脚本（Python 版本）")
    print("="*50)
    
    # 1. 创建测试组织
    print("\n[1/6] 创建测试组织...")
    org, created = Organization.objects.get_or_create(
        name=f"测试组织-主站点-{TIMESTAMP}",
        defaults={"description": "包含 100 个主域名资产的测试组织"}
    )
    print(f"✓ 组织创建成功，ID: {org.id}")
    
    # 2. 批量创建 100 个资产
    print("\n[2/6] 批量创建 100 个域名资产...")
    assets_data = []
    for i in range(1, 101):
        case = i % 10
        if case == 0:
            domain = f"company{i}.com"
        elif case == 1:
            domain = f"site{i}.net"
        elif case == 2:
            domain = f"app{i}.org"
        elif case == 3:
            domain = f"test{i}.io"
        elif case == 4:
            domain = f"demo{i}.tech"
        elif case == 5:
            domain = f"prod{i}.dev"
        elif case == 6:
            domain = f"service{i}.cloud"
        elif case == 7:
            domain = f"api{i}.online"
        elif case == 8:
            domain = f"web{i}.xyz"
        else:
            domain = f"platform{i}.co"
        
        asset, created = Asset.objects.get_or_create(
            name=domain,
            defaults={"description": f"测试域名 #{i}"}
        )
        if created:
            org.assets.add(asset)
            assets_data.append(asset)
    
    print(f"✓ 成功创建/获取 100 个域名资产")
    
    # 3. 为每个资产创建 3 个子域名
    print("\n[3/6] 为每个资产创建子域名（每个 3 个）...")
    domain_counter = 0
    for asset in assets_data[:20]:  # 只为前 20 个资产创建子域名
        for prefix in ["www", "api", "admin"]:
            domain, created = Domain.objects.get_or_create(
                name=f"{prefix}.{asset.name}",
                asset=asset,
                defaults={}
            )
            if created:
                domain_counter += 1
    
    print(f"✓ 成功为 20 个资产创建子域名（约 60 个）")
    
    # 4. 为部分域名创建 Endpoint
    print("\n[4/6] 为部分域名创建 Endpoint...")
    domains = Domain.objects.all()[:60]
    endpoint_counter = 0
    
    paths = [
        "/api/v1/users",
        "/api/v1/posts",
        "/api/v1/products?page=1",
        "/admin/dashboard",
        "/login",
        "/api/v2/search?q=test",
        "/static/js/app.js",
        "/images/logo.png",
        "/api/v1/config",
    ]
    
    methods = ["GET", "POST", "PUT", "DELETE", "PATCH"]
    status_codes = [200, 200, 200, 200, 200, 200, 201, 404, 403, 500]
    
    for idx, domain in enumerate(domains):
        # 为每个域名创建 5-15 个 endpoint
        endpoint_count = 5 + (idx % 11)
        
        for i in range(endpoint_count):
            path = paths[i % len(paths)]
            method = methods[i % len(methods)]
            status_code = status_codes[i % len(status_codes)]
            content_length = 100 + (i * 100) % 9900
            
            endpoint, created = Endpoint.objects.get_or_create(
                url=f"https://{domain.name}{path}",
                domain=domain,
                asset=domain.asset,
                defaults={
                    "method": method,
                    "status_code": status_code,
                    "title": f"Test Page {i}",
                    "content_length": content_length,
                }
            )
            if created:
                endpoint_counter += 1
    
    print(f"✓ 成功创建约 {endpoint_counter} 个 Endpoint")
    
    # 5. 创建边界情况测试数据
    print("\n[5/6] 创建边界情况测试数据...")
    
    edge_assets = [
        ("edge-test.com", "边界测试-普通域名"),
        ("192.168.1.100", "边界测试-IP地址"),
        ("10.0.0.0/8", "边界测试-CIDR网段"),
        ("a.com", "边界测试-单字母域名"),
        ("very-long-domain-name-for-testing-edge-cases-12345.com", "边界测试-超长域名"),
    ]
    
    for name, desc in edge_assets:
        asset, created = Asset.objects.get_or_create(
            name=name,
            defaults={"description": desc}
        )
        if created:
            org.assets.add(asset)
    
    print(f"✓ 边界情况测试数据创建完成")
    
    # 6. 统计总数据量
    print("\n" + "="*50)
    print("  数据生成完成，统计信息：")
    print("="*50)
    
    total_orgs = Organization.objects.count()
    total_assets = Asset.objects.count()
    total_domains = Domain.objects.count()
    total_endpoints = Endpoint.objects.count()
    
    print(f"✓ 组织总数: {total_orgs}")
    print(f"✓ 资产总数: {total_assets}")
    print(f"✓ 子域名总数: {total_domains}")
    print(f"✓ Endpoint 总数: {total_endpoints}")
    
    print("\n✓ 所有测试数据生成完成！")

if __name__ == "__main__":
    create_test_data()
