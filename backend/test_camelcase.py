#!/usr/bin/env python
"""
测试 djangorestframework-camel-case 配置

运行方式：
1. 确保已安装依赖：pip install djangorestframework-camel-case==1.4.2
2. 启动开发服务器：python manage.py runserver 8888
3. 在另一个终端运行此脚本：python test_camelcase.py
"""

import requests
import json

BASE_URL = "http://localhost:8888"

def test_organization_list():
    """测试组织列表接口的命名转换"""
    print("\n" + "="*70)
    print("测试 1: 获取组织列表")
    print("="*70)
    
    # 发送请求（使用 camelCase 参数）
    url = f"{BASE_URL}/api/v1/organizations/"
    params = {
        "pageSize": 10,  # camelCase
        "sortBy": "name"  # camelCase
    }
    
    print(f"\n📤 发送请求:")
    print(f"   URL: {url}")
    print(f"   参数: {json.dumps(params, ensure_ascii=False, indent=2)}")
    
    try:
        response = requests.get(url, params=params)
        print(f"\n📥 响应状态: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ 响应数据 (前 100 字符):")
            print(f"   {json.dumps(data, ensure_ascii=False, indent=2)[:100]}...")
            
            # 检查是否为 camelCase
            if isinstance(data, dict):
                keys = list(data.keys())
                print(f"\n🔍 检查字段命名:")
                for key in keys[:5]:  # 只检查前5个
                    is_camel = key[0].islower() and '_' not in key
                    status = "✅ camelCase" if is_camel else "❌ snake_case"
                    print(f"   - {key}: {status}")
        else:
            print(f"\n❌ 错误: {response.text}")
            
    except Exception as e:
        print(f"\n❌ 请求失败: {e}")
        print(f"   提示: 请确保后端服务已启动 (python manage.py runserver 8888)")


def test_create_organization():
    """测试创建组织接口的命名转换"""
    print("\n" + "="*70)
    print("测试 2: 创建组织")
    print("="*70)
    
    url = f"{BASE_URL}/api/v1/organizations/create/"
    data = {
        "organizationName": "测试公司",  # camelCase
        "description": "这是一个测试组织"
    }
    
    print(f"\n📤 发送请求:")
    print(f"   URL: {url}")
    print(f"   数据: {json.dumps(data, ensure_ascii=False, indent=2)}")
    
    try:
        response = requests.post(
            url, 
            json=data,
            headers={"Content-Type": "application/json"}
        )
        print(f"\n📥 响应状态: {response.status_code}")
        
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"\n✅ 响应数据:")
            print(f"   {json.dumps(result, ensure_ascii=False, indent=2)}")
            
            # 检查返回数据的命名格式
            if 'data' in result and isinstance(result['data'], dict):
                keys = list(result['data'].keys())
                print(f"\n🔍 检查返回字段命名:")
                for key in keys[:5]:
                    is_camel = key[0].islower() and '_' not in key
                    status = "✅ camelCase" if is_camel else "❌ snake_case"
                    print(f"   - {key}: {status}")
        else:
            print(f"\n❌ 错误: {response.text}")
            
    except Exception as e:
        print(f"\n❌ 请求失败: {e}")
        print(f"   提示: 请确保后端服务已启动 (python manage.py runserver 8888)")


def main():
    print("\n" + "="*70)
    print("Django camelCase 转换测试")
    print("="*70)
    
    print("\n📝 说明:")
    print("   - 前端发送: camelCase (pageSize, organizationName)")
    print("   - 后端接收: snake_case (page_size, organization_name)")
    print("   - 后端返回: camelCase (pageSize, organizationName)")
    print("   - 前端接收: camelCase (直接使用)")
    
    # 运行测试
    test_organization_list()
    # test_create_organization()  # 取消注释以测试创建接口
    
    print("\n" + "="*70)
    print("测试完成!")
    print("="*70)
    print("\n💡 下一步:")
    print("   1. 检查上面的输出，确认字段都是 camelCase")
    print("   2. 如果都是 ✅，说明配置成功!")
    print("   3. 现在可以移除前端的 camelcase-keys 和 snakecase-keys 依赖")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
