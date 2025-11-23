#!/usr/bin/env python3
"""插入主机端口映射数据到数据库"""

import sys
import os
from datetime import datetime
import pytz

# 添加项目路径
sys.path.insert(0, '/Users/yangyang/Desktop/scanner/backend')

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.asset.models import HostPortMapping
from apps.targets.models import Target

def insert_host_port_mapping():
    """插入主机端口映射数据"""
    
    # 数据
    data = {
        'id': 4754,
        'host': 'xinye.com',
        'ip': '198.18.0.27',
        'discovered_at': '2025-11-23 12:01:00.078136+08:00',
        'port': 51
    }
    
    print("=" * 60)
    print("插入主机端口映射数据")
    print("=" * 60)
    print(f"ID: {data['id']}")
    print(f"Host: {data['host']}")
    print(f"IP: {data['ip']}")
    print(f"Port: {data['port']}")
    print(f"发现时间: {data['discovered_at']}")
    print()
    
    # 查找与 xinye.com 相关的 Target
    try:
        # 尝试通过域名找到 Target
        targets = Target.objects.filter(
            domain__icontains='xinye.com',
            deleted_at__isnull=True
        )
        
        if not targets.exists():
            print("❌ 错误：找不到与 xinye.com 相关的 Target")
            print("   请先创建 Target 或指定正确的 target_id")
            
            # 列出所有可用的 Target
            all_targets = Target.objects.filter(deleted_at__isnull=True)[:10]
            if all_targets:
                print("\n可用的 Target:")
                for t in all_targets:
                    print(f"  - ID: {t.id}, Domain: {t.domain}")
            return
        
        target = targets.first()
        print(f"✓ 找到 Target - ID: {target.id}, Domain: {target.domain}")
        print()
        
        # 检查是否已存在相同记录
        existing = HostPortMapping.objects.filter(
            target=target,
            host=data['host'],
            ip=data['ip'],
            port=data['port'],
            deleted_at__isnull=True
        ).first()
        
        if existing:
            print(f"⚠️ 记录已存在 - ID: {existing.id}")
            print(f"   Host: {existing.host}")
            print(f"   IP: {existing.ip}")
            print(f"   Port: {existing.port}")
            print(f"   发现时间: {existing.discovered_at}")
            
            # 询问是否更新
            print("\n是否要更新此记录？(y/n)")
            # 自动更新，不询问
            update = True
        else:
            update = False
        
        # 转换时间
        tz = pytz.timezone('Asia/Shanghai')
        discovered_at = datetime.strptime(
            data['discovered_at'].split('+')[0].strip(),
            '%Y-%m-%d %H:%M:%S.%f'
        )
        discovered_at = tz.localize(discovered_at)
        
        if update and existing:
            # 更新现有记录
            existing.discovered_at = discovered_at
            existing.save()
            print(f"\n✅ 记录已更新 - ID: {existing.id}")
        else:
            # 创建新记录
            mapping = HostPortMapping.objects.create(
                target=target,
                host=data['host'],
                ip=data['ip'],
                port=data['port'],
                discovered_at=discovered_at
            )
            print(f"\n✅ 记录已创建 - ID: {mapping.id}")
        
        # 验证
        saved = HostPortMapping.objects.get(
            target=target,
            host=data['host'],
            ip=data['ip'],
            port=data['port']
        )
        print("\n验证:")
        print(f"  ID: {saved.id}")
        print(f"  Target: {saved.target.domain} (ID: {saved.target_id})")
        print(f"  Host: {saved.host}")
        print(f"  IP: {saved.ip}")
        print(f"  Port: {saved.port}")
        print(f"  发现时间: {saved.discovered_at}")
        
    except Exception as e:
        print(f"\n❌ 插入失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    insert_host_port_mapping()
