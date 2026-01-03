#!/usr/bin/env python3
"""
直接通过 SQL 插入测试数据

用法：
    # 生成常规测试数据
    python backend/scripts/generate_test_data_sql.py
    python backend/scripts/generate_test_data_sql.py --clear  # 清除后重新生成
    
    # 生成百万级测试数据(用于测试 Dashboard 卡片溢出)
    python backend/scripts/generate_test_data_sql.py --million
    python backend/scripts/generate_test_data_sql.py --million --clear  # 清除后生成百万级数据
    
百万级数据说明：
    - 目标: 1,000
    - 子域名: 200,000
    - 网站: 200,000
    - 端点: 200,000
    - IP (host_port_mapping): 200,000
    - 漏洞: 200,000 (critical: 50k, high: 50k, medium: 50k, low: 30k, info: 20k)
    - 总资产: ~660,000
"""

import argparse
import random
import json
import os
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values


def generate_fixed_length_url(target_name: str, length: int = 245, path_hint: str = '') -> str:
    """
    生成固定长度的 URL
    
    Args:
        target_name: 目标域名
        length: 目标URL长度，默认245
        path_hint: 可选的路径提示，用于区分不同类型的URL
    
    Returns:
        固定长度的URL字符串
    """
    base = f'https://{target_name}'
    
    # 基础路径
    paths = [
        '/api/v3/enterprise/security-assessment/vulnerability-management',
        '/admin/dashboard/system-configuration/advanced-settings',
        '/portal/user-authentication/multi-factor/verification',
        '/services/cloud-infrastructure/monitoring/metrics',
        '/internal/system-administration/audit-logging/events',
    ]
    
    path = random.choice(paths) if not path_hint else f'/{path_hint}'
    url = f'{base}{path}'
    
    # 添加查询参数
    param_idx = 0
    while len(url) < length - 20:
        param_idx += 1
        param = f'p{param_idx}={random.randint(10000000, 99999999)}'
        separator = '?' if '?' not in url else '&'
        url = f'{url}{separator}{param}'
    
    # 精确调整到目标长度
    if len(url) < length:
        # 添加填充参数
        padding_needed = length - len(url) - 1  # -1 for '&' or '?'
        if padding_needed > 0:
            separator = '?' if '?' not in url else '&'
            # 创建精确长度的填充
            padding = 'x' * padding_needed
            url = f'{url}{separator}{padding}'
    
    # 截断到精确长度
    if len(url) > length:
        url = url[:length]
    
    return url


def generate_fixed_length_text(length: int = 300, text_type: str = 'description') -> str:
    """
    生成固定长度的文本内容
    
    Args:
        length: 目标文本长度，默认300
        text_type: 文本类型，用于选择不同的内容模板
    
    Returns:
        固定长度的文本字符串
    """
    # 基础文本模板
    templates = {
        'description': [
            'A critical security vulnerability was discovered in the application authentication module. This vulnerability allows attackers to bypass security controls and gain unauthorized access to sensitive system resources. The issue stems from improper input validation and insufficient access control mechanisms. Exploitation could lead to complete system compromise, data exfiltration, and service disruption. Immediate remediation is strongly recommended including implementing proper input sanitization, strengthening authentication mechanisms, and deploying additional security monitoring. The vulnerability affects multiple components including user authentication, session management, API endpoints, and data processing pipelines. Risk assessment indicates high severity with potential for significant business impact.',
            'Server-side request forgery (SSRF) vulnerability detected in the API gateway service. An attacker can manipulate server-side requests to access internal network resources, potentially exposing sensitive configuration data, internal services, and cloud metadata endpoints. The vulnerability exists due to insufficient URL validation in the proxy functionality. This could allow attackers to scan internal networks, access cloud instance metadata, retrieve sensitive credentials, and pivot to other internal systems. Recommended mitigations include implementing strict URL allowlisting, blocking requests to internal IP ranges, and adding network segmentation controls. The vulnerability has been assigned a high severity rating due to potential for lateral movement.',
            'Remote code execution vulnerability identified in the file upload processing module. Insufficient file type validation allows attackers to upload malicious executable files that can be triggered to execute arbitrary code on the server. The vulnerability bypasses existing security controls through specially crafted file headers and extension manipulation. Successful exploitation grants attackers full control over the affected server, enabling data theft, malware deployment, and establishment of persistent backdoor access. Critical remediation steps include implementing strict file type validation, sandboxed file processing, content inspection, and removal of execution permissions from upload directories. This vulnerability requires immediate attention.',
            'Cross-site scripting (XSS) vulnerability found in the user profile management interface. User-supplied input is rendered without proper encoding, allowing injection of malicious JavaScript code. Attackers can exploit this to steal session tokens, perform actions on behalf of authenticated users, redirect victims to phishing sites, and exfiltrate sensitive personal information. The vulnerability affects multiple input fields including display name, bio, and custom URL parameters. Remediation requires implementing context-aware output encoding, Content Security Policy headers, and input validation. Additionally, consider implementing HTTP-only and Secure flags on session cookies to limit the impact of successful XSS attacks.',
            'SQL injection vulnerability discovered in the advanced search functionality. The application constructs database queries using unsanitized user input, enabling attackers to manipulate query logic, extract sensitive data, modify database contents, or execute administrative operations. The vulnerability affects the product search, user lookup, and reporting modules. Exploitation could result in complete database compromise, unauthorized data access, data manipulation, and potential privilege escalation. Immediate remediation includes implementing parameterized queries, stored procedures, input validation, and principle of least privilege for database accounts. Consider deploying a web application firewall as an additional defense layer.',
        ],
        'organization': [
            'A leading global technology corporation specializing in enterprise software solutions, cloud computing infrastructure, cybersecurity services, and digital transformation consulting. The organization operates across multiple continents with regional headquarters in North America, Europe, and Asia-Pacific. Core business units include enterprise resource planning systems, customer relationship management platforms, supply chain optimization tools, and advanced analytics solutions. The company maintains strategic partnerships with major cloud providers and technology vendors. Annual revenue exceeds several billion dollars with consistent year-over-year growth. The organization employs thousands of professionals including software engineers, security researchers, and business consultants.',
            'An innovative financial technology company providing comprehensive digital banking services, payment processing solutions, and investment management platforms. The organization serves millions of customers globally through mobile applications, web portals, and API integrations. Key offerings include real-time payment processing, cryptocurrency trading, automated investment advisory, and small business lending. The company maintains regulatory compliance across multiple jurisdictions and holds various financial services licenses. Security infrastructure includes advanced fraud detection, multi-factor authentication, and end-to-end encryption. The organization has received multiple industry awards for innovation and customer satisfaction.',
            'A healthcare technology enterprise focused on electronic health records, telemedicine platforms, medical device integration, and healthcare analytics. The organization partners with hospitals, clinics, and healthcare systems worldwide to improve patient outcomes and operational efficiency. Core products include comprehensive EHR systems, patient engagement portals, clinical decision support tools, and population health management platforms. The company maintains strict compliance with healthcare regulations including HIPAA, GDPR, and regional data protection requirements. Research and development investments focus on artificial intelligence applications in diagnostics, treatment optimization, and predictive health analytics.',
        ],
        'title': [
            'Enterprise Resource Planning System - Comprehensive Business Management Dashboard with Real-time Analytics, Workflow Automation, and Multi-department Integration Capabilities for Global Operations Management and Strategic Decision Support',
            'Advanced Security Operations Center - Unified Threat Detection and Response Platform featuring Machine Learning-powered Anomaly Detection, Automated Incident Response, and Comprehensive Security Posture Management',
            'Customer Experience Management Platform - Omnichannel Engagement Solution with AI-driven Personalization, Journey Orchestration, Sentiment Analysis, and Predictive Customer Behavior Modeling Capabilities',
            'Cloud Infrastructure Management Console - Multi-cloud Orchestration Platform supporting AWS, Azure, and GCP with Automated Provisioning, Cost Optimization, Compliance Monitoring, and Performance Analytics',
            'Data Analytics and Business Intelligence Suite - Self-service Analytics Platform with Advanced Visualization, Predictive Modeling, Natural Language Query Processing, and Automated Report Generation',
        ],
    }
    
    # 选择模板
    template_list = templates.get(text_type, templates['description'])
    base_text = random.choice(template_list)
    
    # 调整到目标长度
    if len(base_text) < length:
        # 需要扩展文本
        padding_words = [
            'Additionally', 'Furthermore', 'Moreover', 'Consequently', 'Subsequently',
            'comprehensive', 'implementation', 'infrastructure', 'configuration', 'authentication',
            'vulnerability', 'exploitation', 'remediation', 'mitigation', 'assessment',
        ]
        while len(base_text) < length - 20:
            base_text += f' {random.choice(padding_words)}'
        # 精确填充
        if len(base_text) < length:
            padding_needed = length - len(base_text)
            base_text += ' ' + 'x' * (padding_needed - 1)
    
    # 截断到精确长度
    if len(base_text) > length:
        base_text = base_text[:length]
    
    return base_text


def load_env_file(env_path: str) -> dict:
    """从 .env 文件加载环境变量"""
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    return env_vars


def get_db_config() -> dict:
    """从 docker/.env 读取数据库配置"""
    # 获取项目根目录
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent.parent
    env_path = project_root / 'docker' / '.env'
    
    env_vars = load_env_file(str(env_path))
    
    # 获取数据库配置，docker/.env 中 DB_HOST=postgres 是容器内地址，本地运行需要用 localhost
    db_host = env_vars.get('DB_HOST', 'postgres')
    if db_host == 'postgres':
        db_host = 'localhost'  # 本地运行脚本时使用 localhost
    
    return {
        'host': db_host,
        'port': int(env_vars.get('DB_PORT', 5432)),
        'dbname': env_vars.get('DB_NAME', 'xingrin'),
        'user': env_vars.get('DB_USER', 'postgres'),
        'password': env_vars.get('DB_PASSWORD', ''),
    }


def generate_raw_response_headers(headers_dict: dict) -> str:
    """
    将响应头字典转换为原始 HTTP 响应头字符串格式
    
    Args:
        headers_dict: 响应头字典
    
    Returns:
        原始 HTTP 响应头字符串，格式如：
        HTTP/1.1 200 OK
        Server: nginx
        Content-Type: text/html
        ...
    """
    lines = ['HTTP/1.1 200 OK']
    for key, value in headers_dict.items():
        # 将下划线转换为连字符，并首字母大写
        header_name = key.replace('_', '-').title()
        lines.append(f'{header_name}: {value}')
    return '\r\n'.join(lines)


DB_CONFIG = get_db_config()


class TestDataGenerator:
    def __init__(self, clear: bool = False):
        self.conn = psycopg2.connect(**DB_CONFIG)
        self.conn.autocommit = False
        self.clear = clear
        
    def run(self):
        try:
            if self.clear:
                print("🗑️  清除现有数据...")
                self.clear_data()
                
            print("🚀 开始生成测试数据...\n")
            
            engine_ids = self.create_engines()
            worker_ids = self.create_workers()
            org_ids = self.create_organizations()
            target_ids = self.create_targets(org_ids)
            scan_ids = self.create_scans(target_ids, engine_ids, worker_ids)
            self.create_scheduled_scans(org_ids, target_ids, engine_ids)
            self.create_subdomains(target_ids)
            website_ids = self.create_websites(target_ids)
            self.create_endpoints(target_ids)
            self.create_directories(target_ids, website_ids)
            self.create_host_port_mappings(target_ids)
            self.create_vulnerabilities(target_ids)
            
            # 生成快照数据(扫描历史详细页面使用)
            self.create_subdomain_snapshots(scan_ids)
            self.create_website_snapshots(scan_ids)
            self.create_endpoint_snapshots(scan_ids)
            self.create_directory_snapshots(scan_ids)
            self.create_host_port_mapping_snapshots(scan_ids)
            self.create_vulnerability_snapshots(scan_ids)
            
            # 生成指纹数据
            self.create_ehole_fingerprints()
            self.create_goby_fingerprints()
            self.create_wappalyzer_fingerprints()
            self.create_fingers_fingerprints()
            self.create_fingerprinthub_fingerprints()
            self.create_arl_fingerprints()
            
            self.conn.commit()
            print("\n✅ 测试数据生成完成！")
        except Exception as e:
            self.conn.rollback()
            print(f"\n❌ 生成失败: {e}")
            raise
        finally:
            self.conn.close()

    def clear_data(self):
        """清除所有测试数据"""
        cur = self.conn.cursor()
        
        # 先删除 IMMV（避免 pg_ivm 的 anyarray bug）
        print("  删除 IMMV...")
        cur.execute("DROP TABLE IF EXISTS asset_search_view CASCADE")
        self.conn.commit()
        
        tables = [
            # 指纹表
            'ehole_fingerprint', 'goby_fingerprint', 'wappalyzer_fingerprint',
            'fingers_fingerprint', 'fingerprinthub_fingerprint', 'arl_fingerprint',
            # 快照表(先删除，因为有外键依赖 scan)
            'vulnerability_snapshot', 'host_port_mapping_snapshot', 'directory_snapshot',
            'endpoint_snapshot', 'website_snapshot', 'subdomain_snapshot',
            # 资产表
            'vulnerability', 'host_port_mapping', 'directory', 'endpoint',
            'website', 'subdomain', 'scheduled_scan', 'scan',
            'organization_targets', 'target', 'organization',
            'nuclei_template_repo', 'wordlist', 'scan_engine', 'worker_node'
        ]
        for table in tables:
            cur.execute(f"DELETE FROM {table}")
        self.conn.commit()
        
        # 重建 IMMV
        print("  重建 IMMV...")
        cur.execute("""
            SELECT pgivm.create_immv('asset_search_view', $$
                SELECT 
                    w.id,
                    w.url,
                    w.host,
                    w.title,
                    w.tech,
                    w.status_code,
                    w.response_headers,
                    w.response_body,
                    w.created_at,
                    w.target_id
                FROM website w
            $$)
        """)
        self.conn.commit()
        print("  ✓ 数据清除完成\n")

    def create_workers(self) -> list:
        """创建 Worker 节点"""
        print("👷 创建 Worker 节点...")
        cur = self.conn.cursor()
        
        # 生成随机后缀确保唯一性
        suffix = random.randint(1000, 9999)
        
        regions = ['asia-singapore-1', 'asia-singapore-2', 'asia-tokyo-1', 'asia-tokyo-2', 'asia-hongkong-1', 
                   'asia-mumbai-1', 'asia-seoul-1', 'asia-sydney-1', 'asia-jakarta-1', 'asia-osaka-1',
                   'europe-frankfurt-1', 'europe-frankfurt-2', 'europe-london-1', 'europe-london-2', 
                   'europe-paris-1', 'europe-ireland-1', 'europe-stockholm-1', 'europe-milan-1',
                   'us-east-virginia-1', 'us-east-virginia-2', 'us-east-ohio-1', 'us-west-oregon-1', 
                   'us-west-oregon-2', 'us-west-california-1', 'us-central-iowa-1',
                   'australia-sydney-1', 'australia-melbourne-1', 'brazil-saopaulo-1', 
                   'canada-montreal-1', 'southafrica-capetown-1', 'middleeast-bahrain-1']
        statuses = ['online', 'offline', 'pending', 'deploying', 'maintenance', 'error', 'upgrading']
        
        workers = [
            (f'local-worker-primary-high-performance-{suffix}', '127.0.0.1', True, 'online'),
            (f'local-worker-secondary-backup-{suffix}', '127.0.0.2', True, 'online'),
        ]
        
        # 随机生成 30-50 个远程 worker
        num_remote = random.randint(30, 50)
        selected_regions = random.sample(regions, min(num_remote, len(regions)))
        for i, region in enumerate(selected_regions):
            ip = f'192.168.{random.randint(1, 254)}.{random.randint(1, 254)}'
            status = random.choice(statuses)
            workers.append((f'remote-worker-{region}-{suffix}-{i:02d}', ip, False, status))
        
        ids = []
        for name, ip, is_local, status in workers:
            cur.execute("""
                INSERT INTO worker_node (name, ip_address, ssh_port, username, password, is_local, status, created_at, updated_at)
                VALUES (%s, %s, 22, 'root', '', %s, %s, NOW(), NOW())
                ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
                RETURNING id
            """, (name, ip, is_local, status))
            row = cur.fetchone()
            if row:
                ids.append(row[0])
                
        print(f"  ✓ 创建了 {len(ids)} 个 Worker 节点\n")
        return ids

    def create_engines(self) -> list:
        """创建扫描引擎"""
        print("⚙️  创建扫描引擎...")
        cur = self.conn.cursor()
        
        suffix = random.randint(1000, 9999)
        
        engine_templates = [
            ('Full-Comprehensive-Security-Assessment-Enterprise-Grade-Vulnerability-Detection-System', 'subdomain_discovery:\n  enabled: true\n  tools: [subfinder, amass, findomain, assetfinder, chaos]\n  timeout: {timeout}\n  resolvers: [8.8.8.8, 1.1.1.1, 9.9.9.9]\nvulnerability_scanning:\n  enabled: true\n  nuclei:\n    severity: critical,high,medium,low,info\n    rate_limit: {rate}\n    concurrency: {conc}\n    templates: [cves, vulnerabilities, exposures, misconfigurations, default-logins]'),
            ('Quick-Reconnaissance-Fast-Discovery-Lightweight-Asset-Enumeration', 'subdomain_discovery:\n  enabled: true\n  tools: [subfinder, assetfinder]\n  timeout: {timeout}\n  passive_only: true\nport_scanning:\n  enabled: true\n  top_ports: {ports}\n  rate: {rate}'),
            ('Deep-Vulnerability-Assessment-Extended-Security-Analysis-Framework', 'vulnerability_scanning:\n  enabled: true\n  nuclei:\n    severity: critical,high,medium,low,info\n    templates: [cves, vulnerabilities, exposures, misconfigurations, default-logins, takeovers]\n    rate_limit: {rate}\n    concurrency: {conc}\n  dalfox:\n    enabled: true\n    blind_xss: true\n  sqlmap:\n    enabled: true\n    level: 3\n    risk: 2'),
            ('Passive-Information-Gathering-OSINT-Intelligence-Collection-Platform', 'subdomain_discovery:\n  enabled: true\n  passive_only: true\n  sources: [crtsh, hackertarget, threatcrowd, virustotal, securitytrails, shodan, censys, binaryedge]\n  timeout: {timeout}\n  dns_bruteforce: false'),
            ('Web-Application-Security-Scanner-OWASP-Compliance-Testing-Suite', 'web_discovery:\n  enabled: true\n  httpx:\n    threads: {conc}\n    follow_redirects: true\n    screenshot: true\nvulnerability_scanning:\n  enabled: true\n  dalfox:\n    enabled: true\n    blind_xss: true\n  nuclei:\n    templates: [cves, vulnerabilities, exposures]'),
            ('API-Endpoint-Security-Audit-RESTful-GraphQL-Assessment-Tool', 'endpoint_discovery:\n  enabled: true\n  katana:\n    depth: {depth}\n    concurrency: {conc}\n    js_crawl: true\n    automatic_form_fill: true\nvulnerability_scanning:\n  enabled: true\n  nuclei:\n    templates: [exposures, misconfigurations]'),
            ('Infrastructure-Port-Scanner-Network-Service-Detection-Engine', 'port_scanning:\n  enabled: true\n  naabu:\n    top_ports: {ports}\n    rate: {rate}\n    scan_all_ips: true\n  service_detection: true\n  version_detection: true\n  os_detection: true'),
            ('Directory-Bruteforce-Engine-Content-Discovery-Fuzzing-Platform', 'directory_bruteforce:\n  enabled: true\n  ffuf:\n    threads: {conc}\n    wordlist: [common.txt, raft-large-directories.txt, raft-large-files.txt]\n    recursion_depth: {depth}\n    extensions: [php, asp, aspx, jsp, html, js, json, xml]'),
            ('Cloud-Infrastructure-Security-Assessment-AWS-Azure-GCP-Scanner', 'cloud_scanning:\n  enabled: true\n  providers: [aws, azure, gcp]\n  services: [s3, ec2, rds, lambda, storage, compute, sql]\n  misconfigurations: true\n  public_exposure: true'),
            ('Container-Security-Scanner-Kubernetes-Docker-Vulnerability-Detector', 'container_scanning:\n  enabled: true\n  kubernetes:\n    enabled: true\n    rbac_audit: true\n    network_policies: true\n  docker:\n    enabled: true\n    image_scanning: true\n    dockerfile_lint: true'),
            ('Mobile-Application-Security-Testing-iOS-Android-Assessment-Framework', 'mobile_scanning:\n  enabled: true\n  platforms: [ios, android]\n  static_analysis: true\n  dynamic_analysis: true\n  api_testing: true\n  ssl_pinning_bypass: true'),
            ('Compliance-Audit-Scanner-PCI-DSS-HIPAA-SOC2-Assessment-Tool', 'compliance_scanning:\n  enabled: true\n  frameworks: [pci-dss, hipaa, soc2, gdpr, iso27001]\n  automated_reporting: true\n  evidence_collection: true'),
        ]
        
        # 随机选择 8-12 个引擎模板
        num_engines = random.randint(8, 12)
        selected = random.sample(engine_templates, min(num_engines, len(engine_templates)))
        
        ids = []
        for name_base, config_template in selected:
            name = f'{name_base}-{suffix}'
            config = config_template.format(
                rate=random.choice([100, 150, 200, 300]),
                conc=random.choice([10, 20, 50, 100]),
                timeout=random.choice([300, 600, 900, 1200]),
                ports=random.choice([100, 1000, 'full']),
                depth=random.choice([2, 3, 4, 5])
            )
            cur.execute("""
                INSERT INTO scan_engine (name, configuration, created_at, updated_at)
                VALUES (%s, %s, NOW(), NOW())
                ON CONFLICT (name) DO UPDATE SET configuration = EXCLUDED.configuration, updated_at = NOW()
                RETURNING id
            """, (name, config))
            row = cur.fetchone()
            if row:
                ids.append(row[0])
                
        print(f"  ✓ 创建了 {len(ids)} 个扫描引擎\n")
        return ids

    def create_organizations(self) -> list:
        """创建组织"""
        print("🏢 创建组织...")
        cur = self.conn.cursor()
        
        suffix = random.randint(1000, 9999)
        
        org_templates = [
            ('Acme Corporation', '全球领先的技术解决方案提供商，专注于企业级软件开发、云计算服务和网络安全解决方案。公司成立于1995年，总部位于硅谷，在全球50多个国家设有分支机构，员工超过10万人，年营收超过500亿美元。'),
            ('TechStart Innovation Labs', '专注于人工智能、机器学习和区块链技术研发的创新实验室。拥有超过200名博士级研究人员，与全球顶尖大学建立了深度合作关系，已获得超过500项技术专利。'),
            ('Global Financial Services', '提供全方位数字银行服务的金融科技公司，包括移动支付、在线贷款、投资理财等服务。服务覆盖全球180个国家和地区，注册用户超过5亿，日均交易额超过100亿美元。'),
            ('HealthCare Plus Medical', '医疗信息化解决方案提供商，专注于电子病历系统、医院信息管理系统和远程医疗平台开发。产品已部署在全球3000多家医疗机构，服务超过1亿患者。'),
            ('E-Commerce Mega Platform', '亚太地区最大的电子商务平台之一，提供 B2B、B2C 和 C2C 多种交易模式。平台入驻商家超过500万，SKU数量超过10亿，日均订单量超过5000万单。'),
            ('Smart City Infrastructure', '智慧城市基础设施解决方案提供商，专注于物联网传感器网络、智能交通系统、城市大脑平台开发。已在全球100多个城市部署智慧城市解决方案，管理超过1000万个IoT设备。'),
            ('Educational Technology', '在线教育技术联盟，提供 K-12 和高等教育在线学习平台。平台拥有超过10万门课程，注册学员超过1亿人，与全球500多所知名大学建立了合作关系。'),
            ('Green Energy Solutions', '可再生能源管理系统提供商，专注于太阳能、风能发电站的监控、调度和优化管理。管理的清洁能源装机容量超过100GW，每年减少碳排放超过5000万吨。'),
            ('CyberSec Defense Corp', '网络安全防御公司，提供渗透测试、漏洞评估和安全咨询服务。拥有超过1000名认证安全专家，服务全球500强企业中的300多家，年处理安全事件超过100万起。'),
            ('CloudNative Systems', '云原生系统开发商，专注于 Kubernetes、微服务架构和 DevOps 工具链。产品被全球超过10万家企业采用，管理的容器实例超过1亿个，是CNCF的核心贡献者。'),
            ('DataFlow Analytics', '大数据分析平台，提供实时数据处理、商业智能和预测分析服务。平台日处理数据量超过100PB，支持超过1000种数据源接入，服务全球5000多家企业客户。'),
            ('MobileFirst Technologies', '移动优先技术公司，专注于 iOS/Android 应用开发和跨平台解决方案。已开发超过5000款移动应用，累计下载量超过50亿次，月活跃用户超过10亿。'),
            ('Quantum Computing Research', '量子计算研究机构，致力于量子算法、量子纠错和量子网络的前沿研究。拥有全球最先进的量子计算机之一，已实现1000+量子比特的稳定运算。'),
            ('Autonomous Vehicles Corp', '自动驾驶技术公司，专注于L4/L5级别自动驾驶系统研发。测试车队已累计行驶超过1亿公里，在全球20个城市开展商业化运营。'),
            ('Biotech Innovations', '生物技术创新企业，专注于基因编辑、细胞治疗和精准医疗。拥有超过100项生物技术专利，多款创新药物已进入临床试验阶段。'),
            ('Space Technology Systems', '航天技术系统公司，提供卫星通信、遥感数据和太空探索服务。已成功发射超过500颗卫星，建立了覆盖全球的低轨卫星互联网星座。'),
        ]
        
        divisions = ['Global Division', 'Asia Pacific', 'EMEA Region', 'Americas', 'R&D Center', 'Digital Platform', 
                     'Cloud Services', 'Security Team', 'Innovation Lab', 'Enterprise Solutions', 'Consumer Products',
                     'Infrastructure Services', 'Data Analytics', 'AI Research', 'Mobile Development', 'DevOps Platform']
        
        # 随机选择 15-20 个组织
        num_orgs = random.randint(15, 20)
        selected = random.sample(org_templates, min(num_orgs, len(org_templates)))
        
        ids = []
        for name_base, _ in selected:
            division = random.choice(divisions)
            name = f'{name_base} - {division} ({suffix})'
            # 生成固定 300 长度的描述
            desc = generate_fixed_length_text(length=300, text_type='organization')
            cur.execute("""
                INSERT INTO organization (name, description, created_at, deleted_at)
                VALUES (%s, %s, NOW() - INTERVAL '%s days', NULL)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, (name, desc, random.randint(0, 365)))
            row = cur.fetchone()
            if row:
                ids.append(row[0])
                
        print(f"  ✓ 创建了 {len(ids)} 个组织\n")
        return ids


    def create_targets(self, org_ids: list) -> list:
        """创建扫描目标"""
        print("🎯 创建扫描目标...")
        cur = self.conn.cursor()
        
        suffix = random.randint(1000, 9999)
        
        # 超长域名生成，目标 200 字符左右
        # 格式: {env}-{region}-{service}-{version}.{subdomain}.{company}-{project}-{team}-{suffix}.{domain}{tld}
        envs = ['production', 'staging', 'development', 'testing', 'integration', 'performance', 'security-audit']
        regions = ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1', 'sa-east-1', 'eu-west-3']
        services = ['api-gateway', 'authentication-service', 'user-management', 'payment-processing', 'notification-center', 'analytics-engine', 'content-delivery', 'search-indexer']
        versions = ['v1', 'v2', 'v3', 'v2-beta', 'v3-alpha', 'v1-legacy', 'v2-stable']
        subdomains = ['internal-services', 'external-facing', 'partner-integration', 'customer-portal', 'admin-dashboard', 'developer-tools', 'monitoring-system']
        companies = ['acme-corporation-international', 'techstart-innovation-labs', 'globalfinance-services-group', 'healthcare-plus-medical-systems', 'ecommerce-platform-solutions', 'smartcity-infrastructure-development', 'cybersecurity-defense-corporation', 'cloudnative-enterprise-systems']
        projects = ['digital-transformation-initiative', 'cloud-migration-project', 'security-enhancement-program', 'customer-experience-platform', 'data-analytics-modernization', 'infrastructure-automation-suite']
        teams = ['engineering-team-alpha', 'devops-squad-bravo', 'security-team-charlie', 'platform-team-delta', 'infrastructure-team-echo']
        domains = ['enterprise', 'platform', 'services', 'solutions', 'systems']
        tlds = ['.com', '.io', '.net', '.org', '.dev', '.app', '.cloud', '.tech', '.systems']
        
        ids = []
        
        # 随机生成 100-150 个域名目标
        num_domains = random.randint(100, 150)
        used_domains = set()
        
        for i in range(num_domains):
            env = random.choice(envs)
            region = random.choice(regions)
            service = random.choice(services)
            version = random.choice(versions)
            subdomain = random.choice(subdomains)
            company = random.choice(companies)
            project = random.choice(projects)
            team = random.choice(teams)
            domain_name = random.choice(domains)
            tld = random.choice(tlds)
            # 生成超长域名，约 150-200 字符
            domain = f'{env}-{region}-{service}-{version}.{subdomain}.{company}-{project}-{team}-{suffix}.{domain_name}{tld}'
            
            if domain in used_domains:
                continue
            used_domains.add(domain)
            
            cur.execute("""
                INSERT INTO target (name, type, created_at, last_scanned_at, deleted_at)
                VALUES (%s, 'domain', NOW() - INTERVAL '%s days', NOW() - INTERVAL '%s days', NULL)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, (domain, random.randint(30, 365), random.randint(0, 30)))
            row = cur.fetchone()
            if row:
                ids.append(row[0])
                # 随机关联到组织
                if org_ids:
                    # 20% 概率关联多个组织(3-5个)，50% 概率关联1个组织，30% 不关联
                    rand_val = random.random()
                    if rand_val < 0.2:
                        # 关联多个组织 (3-5个)
                        num_orgs = min(random.randint(3, 5), len(org_ids))
                        selected_orgs = random.sample(org_ids, num_orgs)
                        for org_id in selected_orgs:
                            cur.execute("""
                                INSERT INTO organization_targets (organization_id, target_id)
                                VALUES (%s, %s)
                                ON CONFLICT DO NOTHING
                            """, (org_id, row[0]))
                    elif rand_val < 0.7:
                        # 关联1个组织
                        org_id = random.choice(org_ids)
                        cur.execute("""
                            INSERT INTO organization_targets (organization_id, target_id)
                            VALUES (%s, %s)
                            ON CONFLICT DO NOTHING
                        """, (org_id, row[0]))
        
        # 随机生成 50-80 个 IP 目标
        num_ips = random.randint(50, 80)
        for _ in range(num_ips):
            # 使用文档保留的 IP 范围
            ip_ranges = [
                (203, 0, 113),   # TEST-NET-3
                (198, 51, 100),  # TEST-NET-2
                (192, 0, 2),     # TEST-NET-1
            ]
            base = random.choice(ip_ranges)
            ip = f'{base[0]}.{base[1]}.{base[2]}.{random.randint(1, 254)}'
            
            cur.execute("""
                INSERT INTO target (name, type, created_at, last_scanned_at, deleted_at)
                VALUES (%s, 'ip', NOW() - INTERVAL '%s days', NOW() - INTERVAL '%s days', NULL)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, (ip, random.randint(30, 365), random.randint(0, 30)))
            row = cur.fetchone()
            if row:
                ids.append(row[0])
        
        # 随机生成 30-50 个 CIDR 目标
        num_cidrs = random.randint(30, 50)
        cidr_bases = ['10.0', '172.16', '172.17', '172.18', '192.168']
        for _ in range(num_cidrs):
            base = random.choice(cidr_bases)
            third_octet = random.randint(0, 255)
            mask = random.choice([24, 25, 26, 27, 28])
            cidr = f'{base}.{third_octet}.0/{mask}'
            
            cur.execute("""
                INSERT INTO target (name, type, created_at, last_scanned_at, deleted_at)
                VALUES (%s, 'cidr', NOW() - INTERVAL '%s days', NOW() - INTERVAL '%s days', NULL)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, (cidr, random.randint(30, 365), random.randint(0, 30)))
            row = cur.fetchone()
            if row:
                ids.append(row[0])
                
        print(f"  ✓ 创建了 {len(ids)} 个扫描目标\n")
        return ids

    def create_scans(self, target_ids: list, engine_ids: list, worker_ids: list) -> list:
        """创建扫描任务"""
        print("🔍 创建扫描任务...")
        cur = self.conn.cursor()
        
        if not target_ids or not engine_ids:
            print("  ⚠ 缺少目标或引擎，跳过\n")
            return []
        
        statuses = ['cancelled', 'completed', 'failed', 'initiated', 'running']
        status_weights = [0.05, 0.6, 0.1, 0.1, 0.15]  # completed 占比最高
        stages = ['subdomain_discovery', 'port_scanning', 'web_discovery', 'vulnerability_scanning', 'directory_bruteforce', 'endpoint_discovery']
        
        error_messages = [
            'Connection timeout while scanning target. Please check network connectivity.',
            'DNS resolution failed for target domain.',
            'Rate limit exceeded. Scan paused and will resume automatically.',
            'Worker node disconnected during scan execution.',
            'Insufficient disk space on worker node.',
            'Target returned too many errors, scan aborted.',
            'Authentication failed for protected resources.',
        ]
        
        # 获取引擎名称映射
        cur.execute("SELECT id, name FROM scan_engine WHERE id = ANY(%s)", (engine_ids,))
        engine_name_map = {row[0]: row[1] for row in cur.fetchall()}
        
        ids = []
        # 随机选择目标数量 - 增加到 80-120 个
        num_targets = min(random.randint(80, 120), len(target_ids))
        selected_targets = random.sample(target_ids, num_targets)
        
        for target_id in selected_targets:
            # 每个目标随机 3-15 个扫描任务
            num_scans = random.randint(3, 15)
            for _ in range(num_scans):
                status = random.choices(statuses, weights=status_weights)[0]
                # 随机选择 1-3 个引擎
                num_engines = random.randint(1, min(3, len(engine_ids)))
                selected_engine_ids = random.sample(engine_ids, num_engines)
                selected_engine_names = [engine_name_map.get(eid, f'Engine-{eid}') for eid in selected_engine_ids]
                worker_id = random.choice(worker_ids) if worker_ids else None
                
                progress = random.randint(10, 95) if status == 'running' else (100 if status == 'completed' else random.randint(0, 50))
                stage = random.choice(stages) if status == 'running' else ''
                error_msg = random.choice(error_messages) if status == 'failed' else ''
                
                # 随机生成更真实的统计数据
                subdomains = random.randint(50, 2000)
                websites = random.randint(10, 500)
                endpoints = random.randint(100, 5000)
                ips = random.randint(20, 300)
                directories = random.randint(200, 8000)
                vulns_critical = random.randint(0, 20)
                vulns_high = random.randint(0, 50)
                vulns_medium = random.randint(0, 100)
                vulns_low = random.randint(0, 150)
                vulns_total = vulns_critical + vulns_high + vulns_medium + vulns_low + random.randint(0, 100)  # info
                
                days_ago = random.randint(0, 90)
                
                cur.execute("""
                    INSERT INTO scan (
                        target_id, engine_ids, engine_names, merged_configuration, status, worker_id, progress, current_stage,
                        results_dir, error_message, container_ids, stage_progress,
                        cached_subdomains_count, cached_websites_count, cached_endpoints_count,
                        cached_ips_count, cached_directories_count, cached_vulns_total,
                        cached_vulns_critical, cached_vulns_high, cached_vulns_medium, cached_vulns_low,
                        created_at, stopped_at, deleted_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        NOW() - INTERVAL '%s days', %s, NULL
                    )
                    RETURNING id
                """, (
                    target_id, selected_engine_ids, json.dumps(selected_engine_names), '', status, worker_id, progress, stage,
                    f'/app/results/scan_{target_id}_{random.randint(1000, 9999)}', error_msg, '{}', '{}',
                    subdomains, websites, endpoints, ips, directories, vulns_total,
                    vulns_critical, vulns_high, vulns_medium, vulns_low,
                    days_ago,
                    datetime.now() - timedelta(days=days_ago, hours=random.randint(0, 23)) if status in ['completed', 'failed', 'cancelled'] else None
                ))
                row = cur.fetchone()
                if row:
                    ids.append(row[0])
                    
        print(f"  ✓ 创建了 {len(ids)} 个扫描任务\n")
        return ids

    def create_scheduled_scans(self, org_ids: list, target_ids: list, engine_ids: list):
        """创建定时扫描任务"""
        print("⏰ 创建定时扫描任务...")
        cur = self.conn.cursor()
        
        if not engine_ids:
            print("  ⚠ 缺少引擎，跳过\n")
            return
        
        suffix = random.randint(1000, 9999)
        
        schedule_templates = [
            ('Daily-Full-Security-Assessment-Enterprise-Wide-Comprehensive-Vulnerability-Detection', '0 {hour} * * *'),
            ('Weekly-Vulnerability-Scan-Critical-Infrastructure-Protection-Program', '0 {hour} * * {dow}'),
            ('Monthly-Penetration-Testing-External-Attack-Surface-Management', '0 {hour} {dom} * *'),
            ('Hourly-Quick-Reconnaissance-Real-Time-Threat-Intelligence-Gathering', '{min} * * * *'),
            ('Bi-Weekly-Compliance-Check-Regulatory-Standards-Verification-Audit', '0 {hour} 1,15 * *'),
            ('Quarterly-Infrastructure-Audit-Network-Security-Posture-Assessment', '0 {hour} 1 1,4,7,10 *'),
            ('Daily-API-Security-Scan-RESTful-GraphQL-Endpoint-Protection', '{min} {hour} * * *'),
            ('Weekly-Web-Application-Scan-OWASP-Top-10-Vulnerability-Detection', '0 {hour} * * {dow}'),
            ('Nightly-Asset-Discovery-Shadow-IT-Detection-Inventory-Management', '0 {hour} * * *'),
            ('Weekend-Deep-Scan-Intensive-Security-Analysis-Full-Coverage', '0 {hour} * * 0,6'),
            ('Business-Hours-Monitor-Real-Time-Security-Event-Detection-Response', '0 9-17 * * 1-5'),
            ('Off-Hours-Intensive-Scan-Low-Impact-Comprehensive-Assessment', '0 {hour} * * *'),
            ('Continuous-Monitoring-Zero-Day-Vulnerability-Detection-System', '{min} * * * *'),
            ('Cloud-Infrastructure-Security-Assessment-AWS-Azure-GCP-Multi-Cloud', '0 {hour} * * *'),
            ('Container-Security-Scan-Kubernetes-Docker-Image-Vulnerability-Check', '0 {hour} * * {dow}'),
            ('Database-Security-Audit-SQL-Injection-Data-Exposure-Prevention', '0 {hour} {dom} * *'),
            ('Network-Perimeter-Scan-Firewall-Configuration-Compliance-Check', '0 {hour} * * *'),
            ('SSL-TLS-Certificate-Monitoring-Expiration-Vulnerability-Detection', '0 {hour} * * *'),
            ('DNS-Security-Assessment-Zone-Transfer-Subdomain-Takeover-Check', '0 {hour} * * {dow}'),
            ('Email-Security-Scan-SPF-DKIM-DMARC-Configuration-Verification', '0 {hour} {dom} * *'),
            ('Mobile-Application-Security-Testing-iOS-Android-API-Assessment', '0 {hour} * * *'),
            ('IoT-Device-Security-Scan-Firmware-Vulnerability-Network-Exposure', '0 {hour} * * {dow}'),
            ('Third-Party-Risk-Assessment-Vendor-Security-Posture-Evaluation', '0 {hour} 1 * *'),
            ('Incident-Response-Readiness-Security-Control-Effectiveness-Test', '0 {hour} 15 * *'),
            ('Ransomware-Prevention-Scan-Backup-Integrity-Recovery-Verification', '0 {hour} * * *'),
        ]
        
        # 随机选择 40-50 个定时任务
        num_schedules = random.randint(40, 50)
        selected = random.sample(schedule_templates, min(num_schedules, len(schedule_templates)))
        
        # 获取引擎名称映射
        cur.execute("SELECT id, name FROM scan_engine WHERE id = ANY(%s)", (engine_ids,))
        engine_name_map = {row[0]: row[1] for row in cur.fetchall()}
        
        count = 0
        for name_base, cron_template in selected:
            name = f'{name_base}-{suffix}-{count:02d}'
            cron = cron_template.format(
                hour=random.randint(0, 23),
                min=random.randint(0, 59),
                dow=random.randint(0, 6),
                dom=random.randint(1, 28)
            )
            enabled = random.random() > 0.3  # 70% 启用
            
            # 随机选择 1-3 个引擎
            num_engines = random.randint(1, min(3, len(engine_ids)))
            selected_engine_ids = random.sample(engine_ids, num_engines)
            selected_engine_names = [engine_name_map.get(eid, f'Engine-{eid}') for eid in selected_engine_ids]
            
            # 随机决定关联组织还是目标
            if org_ids and target_ids:
                if random.random() > 0.5:
                    org_id = random.choice(org_ids)
                    target_id = None
                else:
                    org_id = None
                    target_id = random.choice(target_ids)
            elif org_ids:
                org_id = random.choice(org_ids)
                target_id = None
            elif target_ids:
                org_id = None
                target_id = random.choice(target_ids)
            else:
                org_id = None
                target_id = None
            
            run_count = random.randint(0, 200)
            has_run = random.random() > 0.2  # 80% 已运行过
            
            cur.execute("""
                INSERT INTO scheduled_scan (
                    name, engine_ids, engine_names, merged_configuration, organization_id, target_id, cron_expression, is_enabled,
                    run_count, last_run_time, next_run_time, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW() - INTERVAL '%s days', NOW())
                ON CONFLICT DO NOTHING
            """, (
                name, selected_engine_ids, json.dumps(selected_engine_names), '', org_id, target_id, cron, enabled,
                run_count if has_run else 0,
                datetime.now() - timedelta(days=random.randint(0, 14), hours=random.randint(0, 23)) if has_run else None,
                datetime.now() + timedelta(hours=random.randint(1, 336))  # 最多 2 周后
            , random.randint(30, 180)))
            count += 1
            
        print(f"  ✓ 创建了 {count} 个定时扫描任务\n")


    def create_subdomains(self, target_ids: list):
        """创建子域名"""
        print("🌐 创建子域名...")
        cur = self.conn.cursor()
        
        prefixes = [
            # 基础服务
            'api', 'admin', 'portal', 'dashboard', 'app', 'mobile', 'staging', 'dev',
            'test', 'qa', 'uat', 'beta', 'alpha', 'demo', 'sandbox', 'internal',
            'secure', 'auth', 'login', 'sso', 'oauth', 'identity', 'accounts',
            'mail', 'smtp', 'imap', 'webmail', 'ftp', 'sftp', 'files', 'storage',
            'cdn', 'static', 'assets', 'media', 'db', 'database', 'mysql', 'postgres',
            'redis', 'mongo', 'elastic', 'vpn', 'remote', 'gateway', 'proxy',
            'monitoring', 'metrics', 'grafana', 'prometheus', 'kibana', 'logs',
            'jenkins', 'ci', 'cd', 'gitlab', 'jira', 'confluence', 'kubernetes', 'k8s',
            'www', 'www2', 'www3', 'ns1', 'ns2', 'mx', 'mx1', 'mx2', 'autodiscover',
            'webdisk', 'cpanel', 'whm', 'webmail2', 'email', 'smtp2', 'pop', 'pop3',
            'imap2', 'calendar', 'contacts', 'drive', 'docs', 'sheets', 'slides',
            'meet', 'chat', 'teams', 'slack', 'discord', 'zoom', 'video', 'stream',
            'blog', 'news', 'press', 'media2', 'images', 'img', 'photos', 'video2',
            'shop', 'store', 'cart', 'checkout', 'pay', 'payment', 'billing', 'invoice',
            'support', 'help', 'helpdesk', 'ticket', 'tickets', 'status', 'health',
            'api-v1', 'api-v2', 'api-v3', 'graphql', 'rest', 'soap', 'rpc', 'grpc',
            # 扩展服务
            'analytics', 'reporting', 'bi', 'data', 'warehouse', 'etl', 'pipeline',
            'ml', 'ai', 'inference', 'training', 'model', 'prediction', 'recommendation',
            'search', 'solr', 'elasticsearch', 'opensearch', 'algolia', 'typesense',
            'cache', 'memcached', 'varnish', 'haproxy', 'loadbalancer', 'nginx-lb',
            'queue', 'rabbitmq', 'kafka', 'pulsar', 'nats', 'activemq', 'sqs',
            'workflow', 'airflow', 'prefect', 'dagster', 'temporal', 'conductor',
            'registry', 'harbor', 'nexus', 'artifactory', 'pypi', 'npm-registry',
            'vault', 'secrets', 'keycloak', 'okta', 'auth0', 'cognito', 'firebase-auth',
            'notification', 'push', 'websocket', 'socket', 'realtime', 'pubsub',
            'backup', 'archive', 'snapshot', 'restore', 'disaster-recovery', 'dr',
            'audit', 'compliance', 'security', 'waf', 'firewall', 'ids', 'ips',
            'tracing', 'jaeger', 'zipkin', 'tempo', 'honeycomb', 'lightstep',
            'config', 'consul', 'etcd', 'zookeeper', 'nacos', 'apollo-config',
            'service-mesh', 'istio', 'linkerd', 'envoy', 'traefik', 'kong',
        ]
        
        # 二级前缀，用于生成更复杂的子域名
        secondary_prefixes = ['', 'prod-', 'dev-', 'staging-', 'test-', 'int-', 'ext-', 'us-', 'eu-', 'ap-', 
                              'us-east-', 'us-west-', 'eu-central-', 'ap-southeast-', 'ap-northeast-',
                              'primary-', 'secondary-', 'backup-', 'dr-', 'canary-', 'blue-', 'green-']
        
        # 获取域名目标
        cur.execute("SELECT id, name FROM target WHERE type = 'domain' AND deleted_at IS NULL")
        domain_targets = cur.fetchall()
        
        count = 0
        batch_data = []
        for target_id, target_name in domain_targets:
            # 每个目标随机 80-150 个子域名
            num = random.randint(80, 150)
            selected = random.sample(prefixes, min(num, len(prefixes)))
            
            for prefix in selected:
                # 随机添加二级前缀
                sec_prefix = random.choice(secondary_prefixes) if random.random() > 0.7 else ''
                subdomain_name = f'{sec_prefix}{prefix}.{target_name}'
                days_ago = random.randint(0, 90)
                batch_data.append((subdomain_name, target_id, days_ago))
                count += 1
        
        # 批量插入
        if batch_data:
            execute_values(cur, """
                INSERT INTO subdomain (name, target_id, created_at)
                VALUES %s
                ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, NOW() - INTERVAL '%s days')")
                
        print(f"  ✓ 创建了 {count} 个子域名\n")

    def create_websites(self, target_ids: list) -> list:
        """创建网站"""
        print("🌍 创建网站...")
        cur = self.conn.cursor()
        
        titles = [
            'Enterprise Resource Planning System - Comprehensive Dashboard | Acme Corporation International Global Operations Management Portal v3.2.1 - Integrated Business Process Automation and Real-time Analytics Platform for Enterprise-wide Resource Optimization',
            'Customer Relationship Management Platform - Secure Login Portal | Multi-Factor Authentication Enabled - Advanced Customer Data Analytics and Sales Pipeline Management System with AI-Powered Insights and Predictive Modeling',
            'Human Resources Information System - Employee Self Service Portal v3.2.1 | Comprehensive Payroll Benefits Time-Off Management - Performance Review Talent Acquisition Onboarding Workflow Automation Platform',
            'Supply Chain Management - Global Logistics Tracking Dashboard | Real-time Updates - Worldwide Distribution Network Monitor with Predictive Analytics Inventory Optimization and Supplier Relationship Management',
            'Business Intelligence Analytics - Executive Summary Report Generator | Advanced Data Visualization Decision Support System - Machine Learning Powered Predictive Analytics and Custom Dashboard Builder',
            'Content Management System - Admin Panel | Headless CMS API Gateway - Multi-tenant Enterprise Publishing Platform with Workflow Automation Digital Asset Management and Multi-language Support',
            'Project Management Collaboration Tools - Team Workspace | Agile Board - Sprint Planning Resource Allocation Time Tracking Budget Management Gantt Charts Kanban Boards and Team Communication Hub',
            'E-Commerce Platform - Product Catalog Management | Inventory Control - Order Processing Fulfillment System with Multi-channel Sales Integration Payment Gateway and Customer Analytics Dashboard',
            'Financial Trading Platform - Real-time Market Data Dashboard | Portfolio Management Risk Analysis System - Algorithmic Trading Support Technical Analysis Tools and Regulatory Compliance Reporting',
            'Healthcare Patient Management System - Electronic Health Records | HIPAA Compliant Medical Information Portal - Appointment Scheduling Prescription Management Lab Results Integration and Telemedicine Support',
        ]
        
        webservers = ['nginx/1.24.0', 'nginx/1.25.3', 'nginx/1.26.0', 'Apache/2.4.57', 'Apache/2.4.58', 'Apache/2.4.59', 
                      'Microsoft-IIS/10.0', 'Microsoft-IIS/8.5', 'Microsoft-IIS/7.5', 'cloudflare', 
                      'gunicorn/21.2.0', 'gunicorn/22.0.0', 'gunicorn/23.0.0', 'uvicorn/0.24.0', 'uvicorn/0.25.0',
                      'Caddy/2.7.5', 'Caddy/2.8.0', 'LiteSpeed', 'LiteSpeed/6.1', 'OpenResty/1.21.4', 'OpenResty/1.25.3',
                      'Tomcat/10.1.15', 'Tomcat/9.0.83', 'Jetty/11.0.18', 'Jetty/12.0.5', 'WildFly/30.0.0',
                      'Kestrel', 'Puma/6.4.0', 'Unicorn/6.1.0', 'Passenger/6.0.18', 'Waitress/2.1.2',
                      'Hypercorn/0.16.0', 'Daphne/4.0.0', 'Twisted/23.10.0', 'CherryPy/18.9.0']
        tech_stacks = [
            ['React 18.2.0', 'React Router 6.21', 'Redux Toolkit 2.0', 'RTK Query', 'Node.js 20.10 LTS', 'Express 4.18.2', 'MongoDB 7.0.4', 'Mongoose 8.0', 'Redis 7.2.3', 'Bull Queue 4.12', 'Nginx 1.25.3', 'Docker 24.0', 'Kubernetes 1.28.4', 'Helm 3.13', 'Prometheus 2.48', 'Grafana 10.2'],
            ['Vue.js 3.4.5', 'Vuex 4.1', 'Vue Router 4.2', 'Pinia 2.1', 'Nuxt 3.9.0', 'Django 5.0.1', 'Django REST Framework 3.14', 'PostgreSQL 16.1', 'Celery 5.3.6', 'RabbitMQ 3.12.10', 'Gunicorn 21.2', 'Nginx 1.25', 'Docker Compose', 'Prometheus', 'Grafana', 'Sentry'],
            ['Angular 17.1.0', 'NgRx 17.0', 'RxJS 7.8', 'Angular Material 17', 'Spring Boot 3.2.1', 'Spring Security 6.2', 'Spring Data JPA', 'MySQL 8.2.0', 'Elasticsearch 8.11.3', 'Apache Kafka 3.6.1', 'Grafana 10.2', 'Jenkins 2.426', 'SonarQube 10.3', 'JUnit 5.10', 'Mockito 5.8'],
            ['Next.js 14.0.4', 'React 18.2', 'TypeScript 5.3', 'Tailwind CSS 3.4', 'FastAPI 0.109.0', 'Pydantic 2.5', 'SQLAlchemy 2.0', 'Redis 7.2', 'PostgreSQL 16', 'Docker 24.0', 'Kubernetes 1.28', 'Istio 1.20', 'ArgoCD 2.9', 'Prometheus', 'Grafana', 'Jaeger'],
            ['Svelte 4.2.8', 'SvelteKit 2.0.6', 'TypeScript 5.3', 'Tailwind CSS 3.4', 'Go 1.21.5', 'Gin 1.9', 'GORM 1.25', 'CockroachDB 23.2', 'NATS 2.10.7', 'Traefik 3.0', 'Consul 1.17', 'Vault 1.15', 'Terraform 1.6', 'Prometheus', 'Grafana', 'Loki'],
            ['React 18.2.0', 'NestJS 10.3.0', 'TypeORM 0.3.17', 'GraphQL 16.8', 'Apollo Server 4.10', 'PostgreSQL 16.1', 'Bull 4.12', 'Redis 7.2.3', 'Swagger 7.1', 'Jest 29.7', 'Supertest 6.3', 'Docker', 'Kubernetes', 'Helm', 'ArgoCD', 'Datadog'],
            ['Vue.js 3.4.5', 'Inertia.js 1.0', 'Laravel 10.40', 'PHP 8.3', 'MySQL 8.2', 'Redis 7.2', 'Laravel Horizon 5.21', 'Laravel Telescope', 'Nginx 1.25', 'Vite 5.0', 'PHPUnit 10.5', 'Pest 2.28', 'Docker', 'GitHub Actions', 'Sentry', 'New Relic'],
            ['Angular 17.1', 'NgRx 17.0', '.NET 8.0', 'Entity Framework Core 8.0', 'ASP.NET Core 8.0', 'SQL Server 2022', 'Azure Service Bus', 'Azure Functions', 'IIS 10', 'SignalR 8.0', 'xUnit 2.6', 'Moq 4.20', 'Azure DevOps', 'Application Insights', 'Azure Monitor'],
        ]
        
        # 真实的 body preview 内容
        response_bodies = [
            '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Login - Enterprise Portal</title><link rel="stylesheet" href="/assets/css/main.css"></head><body><div id="app"></div><script src="/assets/js/bundle.js"></script></body></html>',
            '<!DOCTYPE html><html><head><title>Dashboard</title><meta name="description" content="Enterprise management dashboard for monitoring and analytics"><link rel="icon" href="/favicon.ico"></head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root"></div></body></html>',
            '{"status":"ok","version":"2.4.1","environment":"production","timestamp":"2024-12-22T10:30:00Z","services":{"database":"healthy","cache":"healthy","queue":"healthy"},"uptime":864000}',
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>403 Forbidden</title></head><body><h1>403 Forbidden</h1><p>You don\'t have permission to access this resource. Please contact the administrator if you believe this is an error.</p><hr><address>nginx/1.24.0</address></body></html>',
            '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>系统维护中</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:50px;}</style></head><body><h1>系统正在维护中</h1><p>预计恢复时间：2024-12-23 08:00</p></body></html>',
            '{"error":"Unauthorized","message":"Invalid or expired authentication token. Please login again.","code":"AUTH_001","timestamp":"2024-12-22T15:45:30.123Z","path":"/api/v1/users/profile"}',
            '<!DOCTYPE html><html><head><title>Welcome to nginx!</title><style>body{width:35em;margin:0 auto;font-family:Tahoma,Verdana,Arial,sans-serif;}</style></head><body><h1>Welcome to nginx!</h1><p>If you see this page, the nginx web server is successfully installed and working.</p></body></html>',
            '<?xml version="1.0" encoding="UTF-8"?><error><code>500</code><message>Internal Server Error</message><details>An unexpected error occurred while processing your request. Please try again later or contact support.</details><requestId>req_abc123xyz789</requestId></error>',
            '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=https://login.example.com/sso"><title>Redirecting...</title></head><body><p>Redirecting to login page...</p><a href="https://login.example.com/sso">Click here if not redirected</a></body></html>',
            '{"data":{"user":{"id":12345,"username":"admin","email":"admin@example.com","role":"administrator","lastLogin":"2024-12-21T18:30:00Z","permissions":["read","write","delete","admin"]},"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}}',
            '<!DOCTYPE html><html><head><title>API Documentation - Swagger UI</title><link rel="stylesheet" type="text/css" href="/swagger-ui.css"><link rel="icon" type="image/png" href="/favicon-32x32.png"></head><body><div id="swagger-ui"></div><script src="/swagger-ui-bundle.js"></script></body></html>',
            '{"openapi":"3.0.3","info":{"title":"Enterprise API","description":"RESTful API for enterprise resource management","version":"1.0.0","contact":{"email":"api-support@example.com"}},"servers":[{"url":"https://api.example.com/v1"}]}',
            '<!DOCTYPE html><html><head><title>404 Not Found</title><style>*{margin:0;padding:0;}body{background:#f1f1f1;font-family:Arial;}.container{max-width:600px;margin:100px auto;text-align:center;}</style></head><body><div class="container"><h1>404</h1><p>Page not found</p></div></body></html>',
            'PING OK - Packet loss = 0%, RTA = 0.45 ms|rta=0.450000ms;100.000000;500.000000;0.000000 pl=0%;20;60;0',
            '{"metrics":{"requests_total":1234567,"requests_per_second":450.5,"avg_response_time_ms":23.4,"error_rate":0.02,"active_connections":1250,"memory_usage_mb":2048,"cpu_usage_percent":45.6}}',
            '<!DOCTYPE html><html><head><title>Under Construction</title></head><body style="background:#000;color:#0f0;font-family:monospace;padding:20px;"><pre>  _   _           _             ____                _                   _   _             \n | | | |_ __   __| | ___ _ __  / ___|___  _ __  ___| |_ _ __ _   _  ___| |_(_) ___  _ __  \n | | | | \'_ \\ / _` |/ _ \\ \'__|| |   / _ \\| \'_ \\/ __| __| \'__| | | |/ __| __| |/ _ \\| \'_ \\ \n | |_| | | | | (_| |  __/ |   | |__| (_) | | | \\__ \\ |_| |  | |_| | (__| |_| | (_) | | | |\n  \\___/|_| |_|\\__,_|\\___|_|    \\____\\___/|_| |_|___/\\__|_|   \\__,_|\\___|\\__|_|\\___/|_| |_|\n</pre><p>Coming Soon...</p></body></html>',
            '{"success":false,"error":{"type":"ValidationError","message":"Request validation failed","details":[{"field":"email","message":"Invalid email format"},{"field":"password","message":"Password must be at least 8 characters"}]}}',
            'Server: Apache/2.4.57 (Ubuntu)\nX-Powered-By: PHP/8.2.0\nContent-Type: text/html; charset=UTF-8\nSet-Cookie: PHPSESSID=abc123; path=/; HttpOnly; Secure\n\n<!DOCTYPE html><html><head><title>phpinfo()</title></head><body>PHP Version 8.2.0</body></html>',
        ]
        
        # 获取域名目标
        cur.execute("SELECT id, name FROM target WHERE type = 'domain' AND deleted_at IS NULL LIMIT 80")
        domain_targets = cur.fetchall()
        
        batch_data = []
        for target_id, target_name in domain_targets:
            for i in range(random.randint(15, 30)):
                # 生成固定 245 长度的 URL
                url = generate_fixed_length_url(target_name, length=245, path_hint=f'website/{i:04d}')
                
                # 生成模拟的响应头数据
                response_headers = {
                    'server': random.choice(['nginx', 'Apache', 'cloudflare', 'Microsoft-IIS/10.0']),
                    'content_type': 'text/html; charset=utf-8',
                    'x_powered_by': random.choice(['PHP/8.2', 'ASP.NET', 'Express', None]),
                    'x_frame_options': random.choice(['DENY', 'SAMEORIGIN', None]),
                    'strict_transport_security': 'max-age=31536000; includeSubDomains' if random.choice([True, False]) else None,
                    'set_cookie': f'session={random.randint(100000, 999999)}; HttpOnly; Secure' if random.choice([True, False]) else None,
                }
                # 移除 None 值
                response_headers = {k: v for k, v in response_headers.items() if v is not None}
                
                batch_data.append((
                    url, target_id, target_name, random.choice(titles),
                    random.choice(webservers), random.choice(tech_stacks),
                    random.choice([200, 301, 302, 403, 404]),
                    random.randint(1000, 500000), 'text/html; charset=utf-8',
                    f'https://{target_name}/login' if random.choice([True, False]) else '',
                    random.choice(response_bodies),
                    random.choice([True, False, None]),
                    generate_raw_response_headers(response_headers)
                ))
        
        # 批量插入
        ids = []
        if batch_data:
            execute_values(cur, """
                INSERT INTO website (
                    url, target_id, host, title, webserver, tech, status_code,
                    content_length, content_type, location, response_body, vhost,
                    response_headers, created_at
                ) VALUES %s
                ON CONFLICT DO NOTHING
                RETURNING id
            """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())")
            ids = [row[0] for row in cur.fetchall()]
                    
        print(f"  ✓ 创建了 {len(batch_data)} 个网站\n")
        return ids

    def create_endpoints(self, target_ids: list):
        """创建端点"""
        print("🔗 创建端点...")
        cur = self.conn.cursor()
        
        paths = [
            '/api/v1/users/authentication/login', '/api/v1/users/authentication/logout',
            '/api/v1/users/profile/settings/preferences', '/api/v2/products/catalog/categories/list',
            '/api/v2/orders/checkout/payment-processing', '/api/v3/analytics/dashboard/metrics/summary',
            '/graphql/query', '/graphql/mutation', '/admin/dashboard/overview',
            '/admin/users/management/list', '/admin/settings/configuration/system',
            '/portal/customer/account/billing-history', '/internal/health/readiness-check',
            '/internal/metrics/prometheus-endpoint', '/webhook/payment/stripe/callback',
            '/oauth/authorize', '/oauth/token', '/swagger/v1/swagger.json', '/openapi/v3/api-docs',
            # 扩展路径
            '/api/v1/organizations/enterprise/departments/teams/members/list',
            '/api/v2/inventory/warehouse/locations/zones/shelves/products',
            '/api/v3/reporting/financial/quarterly/revenue/breakdown/by-region',
            '/admin/system/configuration/security/authentication/providers/saml',
            '/admin/audit/logs/security/events/authentication/failures/export',
            '/portal/enterprise/dashboard/analytics/performance/metrics/realtime',
            '/internal/monitoring/infrastructure/kubernetes/pods/health/status',
            '/webhook/integration/salesforce/opportunity/stage-change/notification',
            '/api/v1/customers/enterprise/contracts/subscriptions/billing/invoices',
            '/api/v2/shipping/carriers/fedex/tracking/packages/delivery-status',
            '/api/v3/notifications/channels/email/templates/marketing/campaigns',
            '/admin/content/management/pages/blog/articles/drafts/review-queue',
            '/portal/support/tickets/priority/critical/escalation/management',
            '/internal/jobs/scheduler/cron/tasks/execution/history/logs',
            '/api/v1/search/elasticsearch/indices/products/documents/query',
            '/api/v2/cache/redis/clusters/primary/keys/invalidation/batch',
            '/api/v3/queue/rabbitmq/exchanges/notifications/bindings/routes',
            '/admin/database/migrations/schema/versions/rollback/history',
            '/portal/analytics/google/tag-manager/containers/tags/triggers',
            '/internal/secrets/vault/kv/applications/credentials/rotation',
        ]
        
        gf_patterns = [
            ['debug', 'config', 'api', 'json', 'upload', 'file', 'admin', 'auth', 'secrets', 'credentials'],
            ['backup', 'archive', 'debug', 'trace', 'log', 'error', 'exception', 'stack', 'dump', 'memory'],
            ['api', 'rest', 'graphql', 'websocket', 'grpc', 'soap', 'xml', 'json', 'yaml', 'protobuf'],
            ['auth', 'login', 'logout', 'session', 'token', 'jwt', 'oauth', 'saml', 'sso', 'mfa', 'otp', '2fa'],
            ['upload', 'download', 'file', 'attachment', 'document', 'image', 'video', 'audio', 'media', 'asset'],
            ['admin', 'dashboard', 'panel', 'console', 'management', 'settings', 'config', 'system', 'control'],
            ['database', 'sql', 'query', 'table', 'schema', 'migration', 'backup', 'restore', 'dump', 'export'],
            ['cache', 'redis', 'memcached', 'session', 'storage', 'temp', 'buffer', 'queue', 'message', 'event'],
            ['security', 'vulnerability', 'exploit', 'injection', 'xss', 'csrf', 'ssrf', 'rce', 'lfi', 'sqli'],
            ['payment', 'billing', 'invoice', 'subscription', 'checkout', 'cart', 'order', 'transaction', 'refund'],
            ['user', 'profile', 'account', 'password', 'email', 'phone', 'address', 'preference', 'notification'],
            ['api-key', 'secret-key', 'access-token', 'refresh-token', 'private-key', 'public-key', 'certificate'],
            ['debug', 'trace', 'log', 'error', 'warning', 'info', 'verbose', 'metric', 'monitor', 'health'],
            ['internal', 'private', 'restricted', 'confidential', 'sensitive', 'protected', 'secure', 'encrypted'],
            ['test', 'staging', 'development', 'production', 'sandbox', 'demo', 'preview', 'beta', 'alpha'],
            [],  # 空的情况
        ]
        
        # 100字符长度的标题
        titles = [
            'Enterprise API Gateway - RESTful Service Documentation with OpenAPI 3.0 Specification and Interactive',
            'User Authentication Service - OAuth 2.0 and SAML 2.0 Single Sign-On Integration Platform Dashboard',
            'Payment Processing Gateway - PCI-DSS Compliant Transaction Management System Administration Panel',
            'Content Delivery Network - Global Edge Cache Management and Real-time Analytics Dashboard Interface',
            'Database Administration Console - PostgreSQL Cluster Management with Automated Backup and Recovery',
            'Kubernetes Container Orchestration - Pod Deployment and Service Mesh Configuration Control Panel',
            'Message Queue Management - RabbitMQ Exchange and Binding Configuration with Dead Letter Handling',
            'Search Engine Administration - Elasticsearch Index Management and Query Performance Optimization',
            'Monitoring and Alerting System - Prometheus Metrics Collection with Grafana Dashboard Integration',
            'Security Operations Center - Vulnerability Assessment and Incident Response Management Platform',
            'API Rate Limiting Service - Request Throttling and Quota Management with Real-time Usage Analytics',
            'File Storage Management - S3-Compatible Object Storage with Lifecycle Policy and Access Control',
            'Email Notification Service - SMTP Gateway with Template Management and Delivery Status Tracking',
            'Webhook Integration Platform - Event-Driven Architecture with Retry Logic and Failure Handling',
            'GraphQL API Playground - Interactive Query Builder with Schema Introspection and Documentation',
        ]
        
        # 扩展的技术栈列表（用于生成10-20个技术）
        all_techs = [
            'React 18.2.0', 'Vue.js 3.4', 'Angular 17.1', 'Next.js 14.0', 'Nuxt 3.9', 'Svelte 4.2',
            'Node.js 20.10', 'Express 4.18', 'NestJS 10.3', 'Fastify 4.25', 'Koa 2.15',
            'Python 3.12', 'Django 5.0', 'FastAPI 0.109', 'Flask 3.0', 'Tornado 6.4',
            'Go 1.21', 'Gin 1.9', 'Echo 4.11', 'Fiber 2.52', 'Chi 5.0',
            'Java 21', 'Spring Boot 3.2', 'Quarkus 3.6', 'Micronaut 4.2',
            'PostgreSQL 16.1', 'MySQL 8.2', 'MongoDB 7.0', 'Redis 7.2', 'Elasticsearch 8.11',
            'Kubernetes 1.28', 'Docker 24.0', 'Nginx 1.25', 'Apache 2.4', 'Traefik 3.0',
            'GraphQL 16.8', 'gRPC 1.60', 'WebSocket', 'REST API', 'OpenAPI 3.0',
            'JWT', 'OAuth 2.0', 'SAML 2.0', 'OIDC', 'Passport.js',
            'Webpack 5.89', 'Vite 5.0', 'esbuild 0.19', 'Rollup 4.9', 'Parcel 2.11',
            'TypeScript 5.3', 'Tailwind CSS 3.4', 'Bootstrap 5.3', 'Material UI 5.15',
            'Jest 29.7', 'Vitest 1.1', 'Cypress 13.6', 'Playwright 1.40',
            'Prometheus', 'Grafana 10.2', 'Jaeger', 'Zipkin', 'OpenTelemetry',
            'RabbitMQ 3.12', 'Kafka 3.6', 'NATS 2.10', 'Redis Streams',
            'AWS Lambda', 'Azure Functions', 'Google Cloud Functions', 'Cloudflare Workers',
        ]
        
        # 真实的 API 响应 body preview
        response_bodies = [
            '{"status":"success","data":{"user_id":12345,"username":"john_doe","email":"john@example.com","role":"user","created_at":"2024-01-15T10:30:00Z","last_login":"2024-12-22T08:45:00Z"}}',
            '{"success":true,"message":"Authentication successful","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c","expires_in":3600}',
            '{"error":"Unauthorized","code":"AUTH_FAILED","message":"Invalid credentials provided. Please check your username and password.","timestamp":"2024-12-22T15:30:45.123Z","request_id":"req_abc123xyz"}',
            '{"data":{"products":[{"id":1,"name":"Enterprise License","price":999.99,"currency":"USD"},{"id":2,"name":"Professional License","price":499.99,"currency":"USD"},{"id":3,"name":"Basic License","price":99.99,"currency":"USD"}],"total":3,"page":1,"per_page":10}}',
            '{"health":{"status":"healthy","version":"2.4.1","uptime":"15d 6h 32m","checks":{"database":"ok","redis":"ok","elasticsearch":"ok","rabbitmq":"ok"},"memory":{"used":"2.1GB","total":"8GB"},"cpu":"23%"}}',
            '{"errors":[{"field":"email","message":"Email address is already registered"},{"field":"password","message":"Password must contain at least one uppercase letter, one number, and one special character"}],"code":"VALIDATION_ERROR"}',
            '{"result":{"query":"SELECT * FROM users WHERE id = ?","rows_affected":1,"execution_time_ms":12,"cached":false},"data":[{"id":1,"name":"Admin User","status":"active"}]}',
            '<!DOCTYPE html><html><head><title>GraphQL Playground</title><link rel="stylesheet" href="/graphql/playground.css"></head><body><div id="root"><div class="loading">Loading GraphQL Playground...</div></div><script src="/graphql/playground.js"></script></body></html>',
            '{"swagger":"2.0","info":{"title":"Enterprise API","description":"RESTful API for enterprise resource management","version":"1.0.0"},"host":"api.example.com","basePath":"/v1","schemes":["https"],"paths":{"/users":{"get":{"summary":"List users"}}}}',
            '{"openapi":"3.0.3","info":{"title":"User Management API","version":"2.0.0","description":"API for managing user accounts and permissions","contact":{"email":"api@example.com"}},"servers":[{"url":"https://api.example.com/v2","description":"Production server"}]}',
            '{"metrics":{"http_requests_total":{"value":1523456,"labels":{"method":"GET","status":"200"}},"http_request_duration_seconds":{"value":0.023,"labels":{"quantile":"0.99"}},"process_cpu_seconds_total":{"value":12345.67}}}',
            '# HELP http_requests_total Total number of HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total{method="GET",status="200"} 1523456\nhttp_requests_total{method="POST",status="201"} 45678\n# HELP http_request_duration_seconds HTTP request latency\nhttp_request_duration_seconds{quantile="0.5"} 0.012',
            '{"order":{"id":"ORD-2024-123456","status":"processing","items":[{"sku":"PROD-001","name":"Widget Pro","quantity":2,"price":49.99}],"subtotal":99.98,"tax":8.00,"shipping":5.99,"total":113.97,"created_at":"2024-12-22T14:30:00Z"}}',
            '{"session":{"id":"sess_abc123xyz789","user_id":12345,"ip_address":"192.168.1.100","user_agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36","created_at":"2024-12-22T10:00:00Z","expires_at":"2024-12-22T22:00:00Z","is_active":true}}',
            '{"rate_limit":{"limit":1000,"remaining":847,"reset":1703260800,"retry_after":null},"request_id":"req_xyz789abc123","timestamp":"2024-12-22T16:45:30Z"}',
            '{"webhook":{"id":"wh_123456","event":"payment.completed","data":{"payment_id":"pay_abc123","amount":9999,"currency":"usd","status":"succeeded","customer_id":"cus_xyz789"},"created":1703260800}}',
            '{"oauth":{"access_token":"ya29.a0AfH6SMBx...","token_type":"Bearer","expires_in":3600,"refresh_token":"1//0gYx...","scope":"openid email profile"}}',
            '{"debug":{"request":{"method":"POST","path":"/api/v1/users","headers":{"Content-Type":"application/json","Authorization":"Bearer ***"},"body":{"email":"test@example.com"}},"response":{"status":201,"time_ms":45},"trace_id":"trace_abc123"}}',
            '{"config":{"app":{"name":"Enterprise Portal","version":"3.2.1","environment":"production"},"features":{"dark_mode":true,"beta_features":false,"maintenance_mode":false},"limits":{"max_upload_size":"50MB","rate_limit":"1000/hour"}}}',
            '{"analytics":{"page_views":{"today":12345,"this_week":87654,"this_month":345678},"unique_visitors":{"today":4567,"this_week":23456,"this_month":98765},"bounce_rate":"32.5%","avg_session_duration":"4m 32s"}}',
            '{"search":{"query":"enterprise software","results":[{"id":1,"title":"Enterprise Resource Planning","score":0.95},{"id":2,"title":"Enterprise Security Suite","score":0.87}],"total":156,"took_ms":23,"page":1,"per_page":10}}',
            '{"batch":{"id":"batch_123","status":"completed","total_items":1000,"processed":1000,"failed":3,"started_at":"2024-12-22T10:00:00Z","completed_at":"2024-12-22T10:15:32Z","errors":[{"item_id":45,"error":"Invalid format"},{"item_id":123,"error":"Duplicate entry"}]}}',
            '{"notification":{"id":"notif_abc123","type":"email","recipient":"user@example.com","subject":"Your order has shipped","status":"delivered","sent_at":"2024-12-22T14:30:00Z","opened_at":"2024-12-22T15:45:00Z"}}',
            '{"cache":{"status":"hit","key":"user:12345:profile","ttl":3600,"size_bytes":2048,"created_at":"2024-12-22T10:00:00Z","last_accessed":"2024-12-22T16:30:00Z","hit_count":156}}',
            '{"queue":{"name":"email_notifications","messages":{"pending":234,"processing":12,"completed":45678,"failed":23},"consumers":3,"avg_processing_time_ms":150,"oldest_message_age":"2m 15s"}}',
        ]
        
        # 获取域名目标
        cur.execute("SELECT id, name FROM target WHERE type = 'domain' AND deleted_at IS NULL LIMIT 80")
        domain_targets = cur.fetchall()
        
        count = 0
        batch_data = []
        for target_id, target_name in domain_targets:
            num = random.randint(50, 100)
            selected = random.sample(paths, min(num, len(paths)))
            
            for idx, path in enumerate(selected):
                # 生成固定 245 长度的 URL
                url = generate_fixed_length_url(target_name, length=245, path_hint=f'endpoint/{idx:04d}')
                
                # 生成 100 字符的标题
                title = random.choice(titles)
                
                # 生成 10-20 个技术
                num_techs = random.randint(10, 20)
                tech_list = random.sample(all_techs, min(num_techs, len(all_techs)))
                
                # 生成 10-20 个 tags (gf_patterns)
                tags = random.choice(gf_patterns)
                
                # 生成模拟的响应头数据
                response_headers = {
                    'server': random.choice(['nginx', 'gunicorn', 'uvicorn', 'Apache']),
                    'content_type': 'application/json',
                    'x_request_id': f'req_{random.randint(100000, 999999)}',
                    'x_ratelimit_limit': str(random.choice([100, 1000, 5000])),
                    'x_ratelimit_remaining': str(random.randint(0, 1000)),
                    'cache_control': random.choice(['no-cache', 'max-age=3600', 'private', None]),
                }
                # 移除 None 值
                response_headers = {k: v for k, v in response_headers.items() if v is not None}
                
                batch_data.append((
                    url, target_id, target_name, title,
                    random.choice(['nginx/1.24.0', 'gunicorn/21.2.0']),
                    random.choice([200, 201, 301, 400, 401, 403, 404, 500]),
                    random.randint(100, 50000), 'application/json',
                    tech_list,
                    '', random.choice(response_bodies),
                    random.choice([True, False, None]), tags,
                    generate_raw_response_headers(response_headers)
                ))
                count += 1
        
        # 批量插入
        if batch_data:
            execute_values(cur, """
                INSERT INTO endpoint (
                    url, target_id, host, title, webserver, status_code, content_length,
                    content_type, tech, location, response_body, vhost, matched_gf_patterns,
                    response_headers, created_at
                ) VALUES %s
                ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())")
                
        print(f"  ✓ 创建了 {count} 个端点\n")


    def create_directories(self, target_ids: list, website_ids: list):
        """创建目录"""
        print("📁 创建目录...")
        cur = self.conn.cursor()
        
        dir_paths = [
            '/admin/', '/administrator/', '/wp-admin/', '/wp-content/', '/backup/', '/backups/',
            '/old/', '/archive/', '/temp/', '/test/', '/dev/', '/staging/', '/config/',
            '/api/', '/api/v1/', '/api/v2/', '/uploads/', '/files/', '/documents/', '/docs/',
            '/images/', '/assets/', '/static/', '/css/', '/js/', '/logs/', '/debug/',
            '/private/', '/secure/', '/internal/', '/data/', '/database/', '/phpmyadmin/',
            '/cgi-bin/', '/includes/', '/lib/', '/vendor/', '/node_modules/', '/plugins/',
            '/themes/', '/templates/', '/src/', '/app/', '/portal/', '/dashboard/', '/panel/',
            '/user/', '/users/', '/account/', '/profile/', '/member/', '/customer/',
            # 扩展目录
            '/api/v3/', '/api/internal/', '/api/admin/', '/api/public/', '/api/private/',
            '/admin/config/', '/admin/logs/', '/admin/backup/', '/admin/users/', '/admin/settings/',
            '/system/', '/system/config/', '/system/logs/', '/system/backup/', '/system/cache/',
            '/storage/', '/storage/uploads/', '/storage/temp/', '/storage/cache/', '/storage/logs/',
            '/resources/', '/resources/images/', '/resources/documents/', '/resources/templates/',
            '/public/', '/public/assets/', '/public/uploads/', '/public/images/', '/public/files/',
            '/private/data/', '/private/config/', '/private/keys/', '/private/certificates/',
            '/backup/daily/', '/backup/weekly/', '/backup/monthly/', '/backup/database/',
            '/logs/access/', '/logs/error/', '/logs/audit/', '/logs/security/', '/logs/application/',
            '/cache/', '/cache/views/', '/cache/data/', '/cache/sessions/', '/cache/compiled/',
            '/tmp/', '/tmp/uploads/', '/tmp/sessions/', '/tmp/cache/', '/tmp/exports/',
            '/exports/', '/exports/reports/', '/exports/data/', '/exports/csv/', '/exports/pdf/',
            '/imports/', '/imports/data/', '/imports/csv/', '/imports/xml/', '/imports/json/',
            '/reports/', '/reports/daily/', '/reports/weekly/', '/reports/monthly/', '/reports/annual/',
            '/media/', '/media/images/', '/media/videos/', '/media/audio/', '/media/documents/',
            '/downloads/', '/downloads/software/', '/downloads/documents/', '/downloads/updates/',
        ]
        
        content_types = ['text/html; charset=utf-8', 'application/json', 'text/plain', 'text/css', 
                         'application/xml', 'application/javascript', 'text/xml']
        
        # 直接获取域名目标来生成目录数据
        cur.execute("SELECT id, name FROM target WHERE type = 'domain' AND deleted_at IS NULL LIMIT 100")
        domain_targets = cur.fetchall()
        
        if not domain_targets:
            print("  ⚠ 没有域名目标，跳过\n")
            return
        
        count = 0
        batch_data = []
        for target_id, target_name in domain_targets:
            num = random.randint(60, 100)
            selected = random.sample(dir_paths, min(num, len(dir_paths)))
            
            for idx, path in enumerate(selected):
                # 生成固定 245 长度的 URL
                url = generate_fixed_length_url(target_name, length=245, path_hint=f'directory/{idx:04d}')
                batch_data.append((
                    url, target_id,
                    random.choice([200, 301, 302, 403, 404, 500]),
                    random.randint(0, 100000), random.randint(0, 5000), random.randint(0, 500),
                    random.choice(content_types), random.randint(10000000, 5000000000)
                ))
                count += 1
        
        # 批量插入
        if batch_data:
            execute_values(cur, """
                INSERT INTO directory (
                    url, target_id, status, content_length, words, lines,
                    content_type, duration, created_at
                ) VALUES %s
                ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, NOW())")
                
        print(f"  ✓ 创建了 {count} 个目录\n")

    def create_host_port_mappings(self, target_ids: list):
        """创建主机端口映射"""
        print("🔌 创建主机端口映射...")
        cur = self.conn.cursor()
        
        # 扩展端口列表，包含更多常见端口
        ports = [
            # 常见服务端口
            20, 21, 22, 23, 25, 26, 53, 69, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
            110, 111, 113, 119, 123, 135, 137, 138, 139, 143, 161, 162, 179, 194, 199,
            389, 443, 444, 445, 465, 500, 512, 513, 514, 515, 520, 523, 524, 548, 554,
            # 数据库端口
            1433, 1434, 1521, 1522, 1525, 1526, 1527, 1528, 1529, 1530,
            3306, 3307, 3308, 5432, 5433, 5434, 6379, 6380, 6381,
            9200, 9201, 9300, 9301, 27017, 27018, 27019, 28017,
            # Web 服务端口
            8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009, 8010,
            8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089, 8090,
            8443, 8444, 8445, 8888, 8889, 9000, 9001, 9002, 9003, 9090, 9091, 9443,
            # 消息队列和缓存
            5672, 5673, 15672, 25672, 4369, 11211, 11212, 11213,
            # 容器和编排
            2375, 2376, 2377, 2379, 2380, 6443, 6444, 10250, 10251, 10252, 10255,
            # 监控和日志
            3000, 3001, 3002, 9090, 9091, 9093, 9094, 9100, 9104, 9115, 9116,
            5601, 5602, 9600, 9601, 24224, 24225,
            # 其他常见端口
            993, 995, 1080, 1081, 1723, 2049, 2181, 2182, 2183, 3128, 3129, 3389, 3390,
            4443, 4444, 5000, 5001, 5002, 5003, 5900, 5901, 5902, 5984, 5985,
            6000, 6001, 6002, 7001, 7002, 7003, 7070, 7071, 7443, 7474, 7687,
            8161, 8162, 8180, 8181, 8200, 8201, 8280, 8281, 8300, 8301, 8400, 8401,
            8500, 8501, 8600, 8601, 8686, 8687, 8787, 8788, 8880, 8881, 8983, 8984,
            9418, 9419, 9999, 10000, 10001, 10002, 11111, 12345, 15000, 15001,
            16379, 16380, 18080, 18081, 19999, 20000, 22222, 27018, 27019, 28015, 28016,
            29015, 29016, 30000, 30001, 31337, 32768, 33060, 33061, 44818, 47001, 49152,
            50000, 50001, 50070, 50075, 50090, 54321, 55555, 60000, 60001, 61616, 61617,
        ]
        # 去重
        ports = list(set(ports))
        
        # 获取域名目标
        cur.execute("SELECT id, name FROM target WHERE type = 'domain' AND deleted_at IS NULL LIMIT 80")
        domain_targets = cur.fetchall()
        
        count = 0
        batch_data = []
        for target_id, target_name in domain_targets:
            num_ips = random.randint(15, 30)
            
            for _ in range(num_ips):
                ip = f'192.168.{random.randint(1, 254)}.{random.randint(1, 254)}'
                # 增加每个 IP 的端口数量，30-60 个端口
                num_ports = random.randint(30, 60)
                selected_ports = random.sample(ports, min(num_ports, len(ports)))
                
                for port in selected_ports:
                    batch_data.append((target_id, target_name, ip, port))
                    count += 1
        
        # 批量插入
        if batch_data:
            execute_values(cur, """
                INSERT INTO host_port_mapping (target_id, host, ip, port, created_at)
                VALUES %s
                ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, %s, %s, NOW())")
                    
        print(f"  ✓ 创建了 {count} 个主机端口映射\n")

    def create_vulnerabilities(self, target_ids: list):
        """创建漏洞（基于 website URL 前缀）"""
        print("🐛 创建漏洞...")
        cur = self.conn.cursor()
        
        vuln_types = [
            'sql-injection-authentication-bypass-vulnerability-',
            'cross-site-scripting-xss-stored-persistent-attack-',
            'cross-site-request-forgery-csrf-token-validation--',
            'server-side-request-forgery-ssrf-internal-access--',
            'xml-external-entity-xxe-injection-vulnerability---',
            'remote-code-execution-rce-command-injection-flaw--',
            'local-file-inclusion-lfi-path-traversal-exploit---',
            'directory-traversal-arbitrary-file-read-access----',
            'authentication-bypass-session-management-flaw-----',
            'insecure-direct-object-reference-idor-access-ctrl-',
            'sensitive-data-exposure-information-disclosure----',
            'security-misconfiguration-default-credentials-----',
            'broken-access-control-privilege-escalation-vuln---',
            'cors-misconfiguration-cross-origin-data-leakage---',
            'subdomain-takeover-dns-misconfiguration-exploit---',
            'exposed-admin-panel-unauthorized-access-control---',
            'default-credentials-weak-authentication-bypass----',
            'information-disclosure-sensitive-data-exposure----',
            'command-injection-os-command-execution-exploit----',
            'ldap-injection-directory-service-manipulation-----',
        ]
        
        sources = [
            'nuclei-vulnerability-scanner--',
            'dalfox-xss-parameter-analysis-',
            'sqlmap-sql-injection-testing--',
            'crlfuzz-crlf-injection-finder-',
            'httpx-web-probe-fingerprint---',
            'manual-penetration-testing----',
            'burp-suite-professional-scan--',
            'owasp-zap-security-scanner----',
        ]
        severities = ['unknown', 'info', 'low', 'medium', 'high', 'critical']
        
        # 漏洞路径后缀（会追加到 website URL 后面）
        vuln_paths = [
            '/api/users?id=1',
            '/api/admin/config',
            '/api/v1/auth/login',
            '/api/v2/data/export',
            '/admin/settings',
            '/debug/console',
            '/backup/db.sql',
            '/.env',
            '/.git/config',
            '/wp-admin/',
            '/phpmyadmin/',
            '/api/graphql',
            '/swagger.json',
            '/actuator/health',
            '/metrics',
        ]
        
        # 获取所有 website 的 URL 和 target_id
        cur.execute("SELECT id, url, target_id FROM website LIMIT 500")
        websites = cur.fetchall()
        
        if not websites:
            print("  ⚠ 没有 website 数据，跳过漏洞生成\n")
            return
        
        count = 0
        batch_data = []
        for website_id, website_url, target_id in websites:
            # 每个 website 生成 1-5 个漏洞
            num_vulns = random.randint(1, 5)
            
            for idx in range(num_vulns):
                severity = random.choice(severities)
                cvss_ranges = {
                    'critical': (9.0, 10.0), 'high': (7.0, 8.9), 'medium': (4.0, 6.9),
                    'low': (0.1, 3.9), 'info': (0.0, 0.0), 'unknown': (0.0, 10.0)
                }
                cvss_range = cvss_ranges.get(severity, (0.0, 10.0))
                cvss_score = round(random.uniform(*cvss_range), 1)
                
                # 漏洞 URL = website URL + 漏洞路径
                # 先移除 website URL 中的查询参数
                base_url = website_url.split('?')[0]
                vuln_url = base_url + random.choice(vuln_paths)
                
                description = generate_fixed_length_text(length=300, text_type='description')
                
                raw_output = json.dumps({
                    'template': f'CVE-2024-{random.randint(10000, 99999)}',
                    'matcher_name': 'default',
                    'severity': severity,
                    'matched_at': vuln_url,
                })
                
                batch_data.append((
                    target_id, vuln_url, random.choice(vuln_types), severity,
                    random.choice(sources), cvss_score, description, raw_output
                ))
                count += 1
        
        # 批量插入
        if batch_data:
            execute_values(cur, """
                INSERT INTO vulnerability (
                    target_id, url, vuln_type, severity, source, cvss_score,
                    description, raw_output, created_at
                ) VALUES %s
            """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, NOW())")
                
        print(f"  ✓ 创建了 {count} 个漏洞\n")

    def create_subdomain_snapshots(self, scan_ids: list):
        """创建子域名快照"""
        print("📸 创建子域名快照...")
        cur = self.conn.cursor()
        
        if not scan_ids:
            print("  ⚠ 缺少扫描任务，跳过\n")
            return
        
        prefixes = [
            'api', 'admin', 'portal', 'dashboard', 'app', 'mobile', 'staging', 'dev',
            'test', 'qa', 'uat', 'beta', 'mail', 'vpn', 'cdn', 'static',
            'auth', 'login', 'sso', 'oauth', 'identity', 'accounts', 'secure',
            'monitoring', 'metrics', 'grafana', 'prometheus', 'kibana', 'logs',
            'jenkins', 'ci', 'cd', 'gitlab', 'jira', 'confluence', 'kubernetes',
            'www', 'www2', 'ns1', 'ns2', 'mx', 'mx1', 'autodiscover', 'webmail',
            'api-v1', 'api-v2', 'api-v3', 'internal', 'external', 'public', 'private',
            'gateway', 'proxy', 'cache', 'redis', 'mongo', 'mysql', 'postgres',
            'elastic', 'search', 'analytics', 'reporting', 'billing', 'payment',
            'checkout', 'cart', 'shop', 'store', 'catalog', 'inventory', 'orders',
            'users', 'customers', 'partners', 'vendors', 'suppliers', 'merchants',
            'docs', 'help', 'support', 'faq', 'kb', 'wiki', 'blog', 'news',
            'status', 'health', 'ping', 'heartbeat', 'uptime', 'monitor',
            'backup', 'archive', 'storage', 'files', 'uploads', 'downloads',
            'assets', 'images', 'media', 'video', 'audio', 'fonts', 'icons',
            'api-gateway', 'load-balancer', 'reverse-proxy', 'edge', 'origin',
            'primary', 'secondary', 'failover', 'replica', 'master', 'slave',
            'prod', 'stage', 'preprod', 'sandbox', 'demo', 'preview', 'canary',
        ]
        
        count = 0
        batch_data = []
        for scan_id in scan_ids:  # 为所有扫描创建快照
            # 获取扫描对应的目标域名
            cur.execute("""
                SELECT t.name FROM scan s 
                JOIN target t ON s.target_id = t.id 
                WHERE s.id = %s AND t.type = 'domain'
            """, (scan_id,))
            row = cur.fetchone()
            if not row:
                continue
            target_name = row[0]
            
            num = random.randint(60, 100)
            selected = random.sample(prefixes, min(num, len(prefixes)))
            
            for prefix in selected:
                subdomain_name = f'{prefix}.{target_name}'
                batch_data.append((scan_id, subdomain_name))
                count += 1
        
        # 批量插入
        if batch_data:
            execute_values(cur, """
                INSERT INTO subdomain_snapshot (scan_id, name, created_at)
                VALUES %s
                ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, NOW())")
                
        print(f"  ✓ 创建了 {count} 个子域名快照\n")

    def create_website_snapshots(self, scan_ids: list):
        """创建网站快照"""
        print("📸 创建网站快照...")
        cur = self.conn.cursor()
        
        if not scan_ids:
            print("  ⚠ 缺少扫描任务，跳过\n")
            return
        
        titles = [
            'Enterprise Portal - Login | Secure Access Required - Multi-Factor Authentication',
            'Admin Dashboard - System Management | Configuration Settings Overview',
            'API Documentation - Swagger UI | RESTful Endpoints Reference Guide',
            'Customer Portal - Account Management | Billing Subscription Services',
            'Developer Console - Application Management | API Keys Webhooks Configuration',
            'Support Center - Help Desk | Knowledge Base FAQ Ticket System',
            'Analytics Dashboard - Business Intelligence | Real-time Metrics Reporting',
            'Security Center - Threat Detection | Vulnerability Assessment Reports',
            'User Management - Identity Access Control | Role Permission Administration',
            'Content Management System - Publishing Platform | Media Library Editor',
        ]
        webservers = ['nginx/1.24.0', 'nginx/1.25.3', 'Apache/2.4.57', 'Apache/2.4.58', 
                      'cloudflare', 'gunicorn/21.2.0', 'Microsoft-IIS/10.0']
        tech_stacks = [['React', 'Node.js', 'Express'], ['Vue.js', 'Django', 'PostgreSQL'], 
                       ['Angular', 'Spring Boot', 'MySQL'], ['Next.js', 'FastAPI', 'Redis'],
                       ['Svelte', 'Go', 'MongoDB'], ['React', 'NestJS', 'TypeORM']]
        
        count = 0
        batch_data = []
        for scan_id in scan_ids:  # 为所有扫描创建快照
            cur.execute("""
                SELECT t.name FROM scan s 
                JOIN target t ON s.target_id = t.id 
                WHERE s.id = %s AND t.type = 'domain'
            """, (scan_id,))
            row = cur.fetchone()
            if not row:
                continue
            target_name = row[0]
            
            for i in range(random.randint(30, 60)):
                # 生成固定 245 长度的 URL
                url = generate_fixed_length_url(target_name, length=245, path_hint=f'website-snap/{i:04d}')
                
                # 生成模拟的响应头数据
                response_headers = {
                    'server': random.choice(['nginx', 'Apache', 'cloudflare']),
                    'content_type': 'text/html; charset=utf-8',
                    'x_frame_options': random.choice(['DENY', 'SAMEORIGIN', None]),
                }
                # 移除 None 值
                response_headers = {k: v for k, v in response_headers.items() if v is not None}
                
                batch_data.append((
                    scan_id, url, target_name, random.choice(titles),
                    random.choice(webservers), random.choice(tech_stacks),
                    random.choice([200, 301, 403]),
                    random.randint(1000, 50000), 'text/html; charset=utf-8',
                    '',  # location 字段
                    '<!DOCTYPE html><html><head><title>Test</title></head><body>Content</body></html>',
                    generate_raw_response_headers(response_headers)
                ))
                count += 1
        
        # 批量插入
        if batch_data:
            execute_values(cur, """
                INSERT INTO website_snapshot (
                    scan_id, url, host, title, webserver, tech, status_code,
                    content_length, content_type, location, response_body,
                    response_headers, created_at
                ) VALUES %s
                ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())")
                
        print(f"  ✓ 创建了 {count} 个网站快照\n")

    def create_endpoint_snapshots(self, scan_ids: list):
        """创建端点快照"""
        print("📸 创建端点快照...")
        cur = self.conn.cursor()
        
        if not scan_ids:
            print("  ⚠ 缺少扫描任务，跳过\n")
            return
        
        paths = [
            '/api/v1/users', '/api/v1/auth/login', '/api/v2/products',
            '/admin/dashboard', '/graphql', '/health', '/metrics',
            '/api/v1/organizations/departments/teams/members',
            '/api/v2/inventory/warehouse/locations/products',
            '/api/v3/reporting/analytics/metrics/summary',
            '/admin/system/configuration/security/settings',
            '/portal/customer/account/billing/invoices',
            '/internal/monitoring/kubernetes/pods/status',
            '/webhook/integration/payment/callback/handler',
            '/oauth/authorize/callback/redirect',
            '/swagger/v1/api-docs/openapi.json',
        ]
        
        # 100字符长度的标题
        titles = [
            'Enterprise API Gateway - RESTful Service Documentation with OpenAPI 3.0 Specification and Interactive',
            'User Authentication Service - OAuth 2.0 and SAML 2.0 Single Sign-On Integration Platform Dashboard',
            'Payment Processing Gateway - PCI-DSS Compliant Transaction Management System Administration Panel',
            'Content Delivery Network - Global Edge Cache Management and Real-time Analytics Dashboard Interface',
            'Database Administration Console - PostgreSQL Cluster Management with Automated Backup and Recovery',
        ]
        
        # 扩展的技术栈列表
        all_techs = [
            'React 18.2.0', 'Vue.js 3.4', 'Angular 17.1', 'Next.js 14.0', 'Node.js 20.10',
            'Express 4.18', 'Python 3.12', 'Django 5.0', 'FastAPI 0.109', 'Go 1.21',
            'PostgreSQL 16.1', 'MySQL 8.2', 'MongoDB 7.0', 'Redis 7.2', 'Elasticsearch 8.11',
            'Kubernetes 1.28', 'Docker 24.0', 'Nginx 1.25', 'GraphQL 16.8', 'JWT',
        ]
        
        # 扩展的 tags
        all_tags = [
            'debug', 'config', 'api', 'json', 'upload', 'file', 'admin', 'auth',
            'secrets', 'credentials', 'backup', 'archive', 'trace', 'log', 'error',
            'security', 'vulnerability', 'payment', 'user', 'internal', 'private',
        ]
        
        count = 0
        batch_data = []
        for scan_id in scan_ids:  # 为所有扫描创建快照
            cur.execute("""
                SELECT t.name FROM scan s 
                JOIN target t ON s.target_id = t.id 
                WHERE s.id = %s AND t.type = 'domain'
            """, (scan_id,))
            row = cur.fetchone()
            if not row:
                continue
            target_name = row[0]
            
            for idx, path in enumerate(random.sample(paths, min(random.randint(40, 80), len(paths)))):
                # 生成固定 245 长度的 URL
                url = generate_fixed_length_url(target_name, length=245, path_hint=f'endpoint-snap/{idx:04d}')
                
                # 生成 100 字符的标题
                title = random.choice(titles)
                
                # 生成 10-20 个技术
                num_techs = random.randint(10, 20)
                tech_list = random.sample(all_techs, min(num_techs, len(all_techs)))
                
                # 生成 10-20 个 tags
                num_tags = random.randint(10, 20)
                tags = random.sample(all_tags, min(num_tags, len(all_tags)))
                
                # 生成模拟的响应头数据
                response_headers = {
                    'server': 'nginx/1.24.0',
                    'content_type': 'application/json',
                    'x_request_id': f'req_{random.randint(100000, 999999)}',
                }
                
                batch_data.append((
                    scan_id, url, target_name, title,
                    random.choice([200, 201, 401, 403, 404]),
                    random.randint(100, 5000),
                    '',  # location
                    'nginx/1.24.0',
                    'application/json', tech_list,
                    '{"status":"ok","data":{}}',
                    tags,
                    generate_raw_response_headers(response_headers)
                ))
                count += 1
        
        # 批量插入
        if batch_data:
            execute_values(cur, """
                INSERT INTO endpoint_snapshot (
                    scan_id, url, host, title, status_code, content_length,
                    location, webserver, content_type, tech, response_body,
                    matched_gf_patterns, response_headers, created_at
                ) VALUES %s
                ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())")
                
        print(f"  ✓ 创建了 {count} 个端点快照\n")

    def create_directory_snapshots(self, scan_ids: list):
        """创建目录快照"""
        print("📸 创建目录快照...")
        cur = self.conn.cursor()
        
        if not scan_ids:
            print("  ⚠ 缺少扫描任务，跳过\n")
            return
        
        dirs = [
            '/admin/', '/backup/', '/config/', '/uploads/', '/static/',
            '/assets/', '/images/', '/js/', '/css/', '/api/',
            '/admin/config/', '/admin/logs/', '/admin/backup/', '/admin/users/',
            '/system/', '/system/config/', '/system/logs/', '/system/cache/',
            '/storage/', '/storage/uploads/', '/storage/temp/', '/storage/cache/',
            '/resources/', '/resources/images/', '/resources/documents/',
            '/public/', '/public/assets/', '/public/uploads/', '/public/images/',
            '/private/data/', '/private/config/', '/private/keys/',
            '/backup/daily/', '/backup/weekly/', '/backup/database/',
            '/logs/access/', '/logs/error/', '/logs/audit/', '/logs/security/',
            '/cache/', '/cache/views/', '/cache/data/', '/cache/sessions/',
            '/tmp/', '/tmp/uploads/', '/tmp/sessions/', '/tmp/exports/',
            '/exports/', '/exports/reports/', '/exports/data/', '/exports/csv/',
        ]
        
        count = 0
        batch_data = []
        for scan_id in scan_ids:  # 为所有扫描创建快照
            cur.execute("""
                SELECT t.name FROM scan s 
                JOIN target t ON s.target_id = t.id 
                WHERE s.id = %s AND t.type = 'domain'
            """, (scan_id,))
            row = cur.fetchone()
            if not row:
                continue
            target_name = row[0]
            
            for idx, d in enumerate(random.sample(dirs, min(random.randint(50, 80), len(dirs)))):
                # 生成固定 245 长度的 URL
                url = generate_fixed_length_url(target_name, length=245, path_hint=f'dir-snap/{idx:04d}')
                batch_data.append((
                    scan_id, url, random.choice([200, 301, 403]),
                    random.randint(500, 10000), random.randint(50, 500),
                    random.randint(10, 100), 'text/html',
                    random.randint(10000000, 500000000)  # 纳秒
                ))
                count += 1
        
        # 批量插入
        if batch_data:
            execute_values(cur, """
                INSERT INTO directory_snapshot (
                    scan_id, url, status, content_length, words, lines,
                    content_type, duration, created_at
                ) VALUES %s
                ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, NOW())")
                
        print(f"  ✓ 创建了 {count} 个目录快照\n")

    def create_host_port_mapping_snapshots(self, scan_ids: list):
        """创建主机端口映射快照"""
        print("📸 创建主机端口映射快照...")
        cur = self.conn.cursor()
        
        if not scan_ids:
            print("  ⚠ 缺少扫描任务，跳过\n")
            return
        
        common_ports = [22, 80, 443, 3306, 5432, 6379, 8080, 8443, 9000,
                        21, 23, 25, 53, 110, 143, 389, 445, 993, 995,
                        1433, 1521, 2049, 2181, 3000, 3389, 5000, 5672,
                        6443, 7001, 8000, 8081, 8888, 9090, 9200, 27017]
        
        count = 0
        batch_data = []
        for scan_id in scan_ids:  # 为所有扫描创建快照
            cur.execute("""
                SELECT t.name FROM scan s 
                JOIN target t ON s.target_id = t.id 
                WHERE s.id = %s AND t.type = 'domain'
            """, (scan_id,))
            row = cur.fetchone()
            if not row:
                continue
            target_name = row[0]
            
            # 生成多个随机 IP
            for _ in range(random.randint(10, 20)):
                ip = f'192.168.{random.randint(1, 254)}.{random.randint(1, 254)}'
                
                for port in random.sample(common_ports, min(random.randint(20, 35), len(common_ports))):
                    batch_data.append((scan_id, target_name, ip, port))
                    count += 1
        
        # 批量插入
        if batch_data:
            execute_values(cur, """
                INSERT INTO host_port_mapping_snapshot (
                    scan_id, host, ip, port, created_at
                ) VALUES %s
                ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, %s, %s, NOW())")
                
        print(f"  ✓ 创建了 {count} 个主机端口映射快照\n")

    def create_vulnerability_snapshots(self, scan_ids: list):
        """创建漏洞快照"""
        print("📸 创建漏洞快照...")
        cur = self.conn.cursor()
        
        if not scan_ids:
            print("  ⚠ 缺少扫描任务，跳过\n")
            return
        
        vuln_types = [
            'sql-injection-authentication-bypass-vulnerability-',
            'cross-site-scripting-xss-stored-persistent-attack-',
            'server-side-request-forgery-ssrf-internal-access--',
            'remote-code-execution-rce-command-injection-flaw--',
            'insecure-direct-object-reference-idor-access-ctrl-',
            'authentication-bypass-session-management-flaw-----',
            'cors-misconfiguration-cross-origin-data-leakage---',
            'command-injection-os-command-execution-exploit----',
            'deserialization-vulnerability-object-injection----',
            'jwt-vulnerability-token-forgery-authentication----',
            'open-redirect-url-redirection-phishing-attack-----',
            'path-traversal-arbitrary-file-read-access-vuln----',
        ]
        severities = ['critical', 'high', 'medium', 'low', 'info']
        sources = [
            'nuclei-vulnerability-scanner--',
            'dalfox-xss-parameter-analysis-',
            'sqlmap-sql-injection-testing--',
            'burp-suite-professional-scan--',
            'owasp-zap-security-scanner----',
            'nmap-network-service-scanner--',
            'nikto-web-server-scanner------',
        ]
        
        count = 0
        batch_data = []
        for scan_id in scan_ids:  # 为所有扫描创建快照
            cur.execute("""
                SELECT t.name FROM scan s 
                JOIN target t ON s.target_id = t.id 
                WHERE s.id = %s AND t.type = 'domain'
            """, (scan_id,))
            row = cur.fetchone()
            if not row:
                continue
            target_name = row[0]
            
            for idx in range(random.randint(30, 60)):
                severity = random.choice(severities)
                cvss_ranges = {
                    'critical': (9.0, 10.0), 'high': (7.0, 8.9), 'medium': (4.0, 6.9),
                    'low': (0.1, 3.9), 'info': (0.0, 0.0)
                }
                cvss_range = cvss_ranges.get(severity, (0.0, 10.0))
                cvss_score = round(random.uniform(*cvss_range), 1)
                
                # 生成固定 245 长度的 URL
                url = generate_fixed_length_url(target_name, length=245, path_hint=f'vuln-snap/{idx:04d}')
                
                # 生成固定 300 长度的描述
                description = generate_fixed_length_text(length=300, text_type='description')
                
                batch_data.append((
                    scan_id, url, random.choice(vuln_types), severity,
                    random.choice(sources), cvss_score,
                    description,
                    json.dumps({'template': f'CVE-2024-{random.randint(10000, 99999)}'})
                ))
                count += 1
        
        # 批量插入
        if batch_data:
            execute_values(cur, """
                INSERT INTO vulnerability_snapshot (
                    scan_id, url, vuln_type, severity, source, cvss_score,
                    description, raw_output, created_at
                ) VALUES %s
            """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, NOW())")
                
        print(f"  ✓ 创建了 {count} 个漏洞快照\n")

    def create_ehole_fingerprints(self):
        """创建 EHole 指纹数据"""
        print("🔍 创建 EHole 指纹...")
        cur = self.conn.cursor()
        
        # CMS/产品名称模板（长名称）
        cms_templates = [
            'WordPress-Enterprise-Content-Management-System-Professional-Edition',
            'Drupal-Open-Source-CMS-Platform-Community-Extended-Version',
            'Joomla-Web-Content-Management-Framework-Business-Suite',
            'Magento-E-Commerce-Platform-Enterprise-Cloud-Edition',
            'Shopify-Online-Store-Builder-Professional-Business-Plan',
            'PrestaShop-E-Commerce-Solution-Multi-Store-Edition',
            'OpenCart-Shopping-Cart-System-Enterprise-Features',
            'WooCommerce-WordPress-E-Commerce-Plugin-Extended',
            'Laravel-PHP-Framework-Application-Boilerplate',
            'Django-Python-Web-Framework-Admin-Dashboard',
            'Spring-Boot-Java-Microservices-Framework-Starter',
            'Express-Node-JS-Web-Application-Framework-API',
            'Ruby-on-Rails-MVC-Framework-Application-Template',
            'ASP-NET-Core-Microsoft-Web-Framework-Enterprise',
            'Flask-Python-Micro-Framework-REST-API-Template',
            'FastAPI-Python-Modern-Web-Framework-OpenAPI',
            'Next-JS-React-Framework-Server-Side-Rendering',
            'Nuxt-JS-Vue-Framework-Universal-Application',
            'Angular-Universal-Server-Side-Rendering-Platform',
            'Svelte-Kit-Web-Application-Framework-Compiler',
            'Apache-Tomcat-Java-Servlet-Container-Server',
            'Nginx-Web-Server-Reverse-Proxy-Load-Balancer',
            'Microsoft-IIS-Internet-Information-Services-Server',
            'Apache-HTTP-Server-Web-Server-Platform',
            'Caddy-Web-Server-Automatic-HTTPS-Configuration',
            'LiteSpeed-Web-Server-High-Performance-HTTP',
            'Oracle-WebLogic-Server-Java-EE-Application',
            'IBM-WebSphere-Application-Server-Enterprise',
            'JBoss-EAP-Enterprise-Application-Platform-RedHat',
            'GlassFish-Server-Open-Source-Java-EE-Reference',
        ]
        
        methods = ['keyword', 'faviconhash', 'regula']
        locations = ['body', 'header', 'title', 'server', 'cookie', 'cert']
        types = ['CMS', 'Framework', 'Server', 'Database', 'Cache', 'CDN', 'WAF', 'Load-Balancer', 'Container', 'Cloud']
        
        # 关键词模板（多个长关键词）
        keyword_templates = [
            ['wp-content/themes/', 'wp-includes/js/', 'wp-admin/css/', 'wordpress-hash-', 'wp-json/wp/v2/'],
            ['sites/all/modules/', 'misc/drupal.js', 'drupal-settings-json', 'X-Drupal-Cache', 'X-Generator: Drupal'],
            ['media/jui/js/', 'administrator/index.php', 'Joomla!', 'com_content', 'mod_custom'],
            ['skin/frontend/', 'Mage.Cookies', 'MAGENTO_CACHE', 'varien/js.js', 'mage/cookies.js'],
            ['cdn.shopify.com', 'Shopify.theme', 'shopify-section', 'shopify-payment-button', 'myshopify.com'],
            ['prestashop', 'PrestaShop', 'ps_versions_compliancy', 'prestashop-page', 'id_product'],
            ['catalog/view/theme/', 'index.php?route=', 'OpenCart', 'text_home', 'common/home'],
            ['woocommerce', 'WooCommerce', 'wc-ajax', 'woocommerce-page', 'add_to_cart_button'],
            ['laravel_session', 'XSRF-TOKEN', 'Laravel', 'laravel-livewire', 'laravel_token'],
            ['csrfmiddlewaretoken', 'django.contrib', 'Django', '__admin_media_prefix__', 'django-debug-toolbar'],
            ['X-Application-Context', 'spring-boot', 'Spring', 'actuator/health', 'spring-security'],
            ['X-Powered-By: Express', 'express-session', 'connect.sid', 'express.static', 'express-validator'],
            ['X-Powered-By: Phusion', 'Rails', 'csrf-token', 'action_controller', 'rails-ujs'],
            ['X-AspNet-Version', 'ASP.NET', '__VIEWSTATE', '__EVENTVALIDATION', 'aspnetcore-'],
            ['Werkzeug', 'Flask', 'flask-login', 'flask-wtf', 'flask-session'],
        ]
        
        count = 0
        batch_data = []
        
        for i in range(200):  # 生成 200 条 EHole 指纹
            cms = f'{random.choice(cms_templates)}-{random.randint(1000, 9999)}'
            method = random.choice(methods)
            location = random.choice(locations)
            keywords = random.choice(keyword_templates) + [f'custom-keyword-{random.randint(10000, 99999)}' for _ in range(random.randint(3, 8))]
            is_important = random.choice([True, False])
            fp_type = random.choice(types)
            
            batch_data.append((
                cms, method, location, json.dumps(keywords), is_important, fp_type
            ))
            count += 1
        
        if batch_data:
            execute_values(cur, """
                INSERT INTO ehole_fingerprint (cms, method, location, keyword, is_important, type, created_at)
                VALUES %s
                ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, %s, %s, %s, %s, NOW())")
        
        print(f"  ✓ 创建了 {count} 个 EHole 指纹\n")

    def create_goby_fingerprints(self):
        """创建 Goby 指纹数据"""
        print("🔍 创建 Goby 指纹...")
        cur = self.conn.cursor()
        
        # 产品名称模板（长名称）
        name_templates = [
            'Apache-Tomcat-Java-Servlet-Container-Application-Server-Enterprise',
            'Nginx-High-Performance-Web-Server-Reverse-Proxy-Load-Balancer',
            'Microsoft-Exchange-Server-Email-Collaboration-Platform-Enterprise',
            'VMware-vCenter-Server-Virtual-Infrastructure-Management-Platform',
            'Cisco-Adaptive-Security-Appliance-Firewall-VPN-Concentrator',
            'Fortinet-FortiGate-Next-Generation-Firewall-Security-Platform',
            'Palo-Alto-Networks-Firewall-Threat-Prevention-Platform',
            'F5-BIG-IP-Application-Delivery-Controller-Load-Balancer',
            'Citrix-NetScaler-Application-Delivery-Controller-Gateway',
            'Juniper-Networks-SRX-Series-Services-Gateway-Firewall',
            'Oracle-WebLogic-Server-Java-Enterprise-Application-Platform',
            'IBM-WebSphere-Application-Server-Java-EE-Enterprise-Edition',
            'SAP-NetWeaver-Application-Server-Business-Suite-Platform',
            'Adobe-Experience-Manager-Content-Management-System-Enterprise',
            'Atlassian-Confluence-Team-Collaboration-Wiki-Platform-Server',
            'Atlassian-Jira-Project-Issue-Tracking-Software-Server-Edition',
            'GitLab-DevOps-Platform-Source-Code-Management-CI-CD-Pipeline',
            'Jenkins-Automation-Server-Continuous-Integration-Deployment',
            'SonarQube-Code-Quality-Security-Analysis-Platform-Enterprise',
            'Elasticsearch-Distributed-Search-Analytics-Engine-Cluster',
            'Kibana-Data-Visualization-Dashboard-Elasticsearch-Frontend',
            'Grafana-Observability-Platform-Metrics-Logs-Traces-Dashboard',
            'Prometheus-Monitoring-System-Time-Series-Database-Alerting',
            'Zabbix-Enterprise-Monitoring-Solution-Network-Server-Cloud',
            'Nagios-Infrastructure-Monitoring-Alerting-System-Enterprise',
            'Redis-In-Memory-Data-Structure-Store-Cache-Message-Broker',
            'MongoDB-Document-Database-NoSQL-Distributed-Cluster-Platform',
            'PostgreSQL-Advanced-Open-Source-Relational-Database-System',
            'MySQL-Enterprise-Relational-Database-Management-System-Server',
            'Microsoft-SQL-Server-Relational-Database-Management-Platform',
        ]
        
        # 逻辑表达式模板
        logic_templates = [
            '(a&&b)||c', 'a||(b&&c)', '(a||b)&&(c||d)', 'a&&b&&c', 'a||b||c',
            '((a&&b)||c)&&d', '(a||(b&&c))&&(d||e)', 'a&&(b||c)&&d',
            '(a&&b&&c)||(d&&e)', '((a||b)&&c)||(d&&e&&f)',
        ]
        
        # 规则模板
        rule_labels = ['body', 'header', 'title', 'server', 'cert', 'banner', 'protocol', 'port']
        
        count = 0
        batch_data = []
        
        for i in range(200):  # 生成 200 条 Goby 指纹
            name = f'{random.choice(name_templates)}-{random.randint(1000, 9999)}'
            logic = random.choice(logic_templates)
            
            # 生成 5-15 条规则
            num_rules = random.randint(5, 15)
            rules = []
            for j in range(num_rules):
                rule = {
                    'label': random.choice(rule_labels),
                    'feature': f'feature-pattern-{random.randint(10000, 99999)}-{random.choice(["regex", "keyword", "hash"])}',
                    'is_equal': random.choice([True, False])
                }
                rules.append(rule)
            
            batch_data.append((name, logic, json.dumps(rules)))
            count += 1
        
        if batch_data:
            execute_values(cur, """
                INSERT INTO goby_fingerprint (name, logic, rule, created_at)
                VALUES %s
                ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, %s, NOW())")
        
        print(f"  ✓ 创建了 {count} 个 Goby 指纹\n")

    def create_wappalyzer_fingerprints(self):
        """创建 Wappalyzer 指纹数据"""
        print("🔍 创建 Wappalyzer 指纹...")
        cur = self.conn.cursor()
        
        # 应用名称模板（长名称）
        name_templates = [
            'WordPress-Content-Management-System-Open-Source-Blogging-Platform',
            'React-JavaScript-Library-User-Interface-Components-Facebook',
            'Vue-JS-Progressive-JavaScript-Framework-Reactive-Components',
            'Angular-Platform-Web-Application-Framework-Google-TypeScript',
            'jQuery-JavaScript-Library-DOM-Manipulation-Event-Handling',
            'Bootstrap-CSS-Framework-Responsive-Design-Mobile-First',
            'Tailwind-CSS-Utility-First-Framework-Rapid-UI-Development',
            'Node-JS-JavaScript-Runtime-Server-Side-V8-Engine-Platform',
            'Express-JS-Web-Application-Framework-Node-JS-Middleware',
            'Django-Python-Web-Framework-Batteries-Included-MTV-Pattern',
            'Flask-Python-Micro-Framework-Lightweight-WSGI-Application',
            'Ruby-on-Rails-MVC-Framework-Convention-Over-Configuration',
            'Laravel-PHP-Framework-Elegant-Syntax-Expressive-Beautiful',
            'Spring-Framework-Java-Enterprise-Application-Development',
            'ASP-NET-Core-Cross-Platform-Web-Framework-Microsoft-Open',
            'Nginx-Web-Server-Reverse-Proxy-Load-Balancer-HTTP-Cache',
            'Apache-HTTP-Server-Web-Server-Cross-Platform-Open-Source',
            'Cloudflare-CDN-DDoS-Protection-Web-Application-Firewall',
            'Amazon-Web-Services-Cloud-Computing-Platform-Infrastructure',
            'Google-Cloud-Platform-Cloud-Computing-Services-Infrastructure',
            'Microsoft-Azure-Cloud-Computing-Service-Platform-Enterprise',
            'Docker-Container-Platform-Application-Deployment-Orchestration',
            'Kubernetes-Container-Orchestration-Platform-Cloud-Native',
            'Elasticsearch-Search-Analytics-Engine-Distributed-RESTful',
            'Redis-In-Memory-Data-Store-Cache-Message-Broker-Database',
            'MongoDB-Document-Database-NoSQL-Scalable-High-Performance',
            'PostgreSQL-Object-Relational-Database-System-Open-Source',
            'MySQL-Relational-Database-Management-System-Oracle-Open',
            'GraphQL-Query-Language-API-Runtime-Data-Fetching-Facebook',
            'Webpack-Module-Bundler-JavaScript-Asset-Pipeline-Build-Tool',
        ]
        
        # 分类 ID
        cats_options = [
            [1, 2, 3], [4, 5], [6, 7, 8, 9], [10, 11, 12], [13, 14, 15, 16],
            [17, 18], [19, 20, 21], [22, 23, 24, 25], [26, 27], [28, 29, 30],
        ]
        
        # 描述模板
        descriptions = [
            'A powerful and flexible content management system designed for enterprise-level web applications with extensive plugin ecosystem and community support.',
            'Modern JavaScript framework for building interactive user interfaces with component-based architecture and virtual DOM for optimal performance.',
            'High-performance web server and reverse proxy with advanced load balancing, caching, and security features for production deployments.',
            'Comprehensive cloud computing platform providing infrastructure as a service, platform as a service, and software as a service solutions.',
            'Enterprise-grade database management system with ACID compliance, advanced security features, and horizontal scaling capabilities.',
            'Container orchestration platform for automating deployment, scaling, and management of containerized applications across clusters.',
            'Full-stack web application framework with built-in ORM, authentication, and admin interface for rapid development.',
            'Lightweight and modular CSS framework with utility classes for building responsive and customizable user interfaces.',
            'Real-time search and analytics engine with distributed architecture for handling large-scale data processing workloads.',
            'In-memory data structure store supporting various data types with persistence options and pub/sub messaging capabilities.',
        ]
        
        count = 0
        batch_data = []
        
        for i in range(200):  # 生成 200 条 Wappalyzer 指纹
            name = f'{random.choice(name_templates)}-{random.randint(1000, 9999)}'
            cats = random.choice(cats_options)
            
            # 生成 cookies 规则
            cookies = {}
            for j in range(random.randint(2, 5)):
                cookies[f'cookie_name_{j}'] = f'regex_pattern_{random.randint(1000, 9999)}'
            
            # 生成 headers 规则
            headers = {}
            header_names = ['X-Powered-By', 'Server', 'X-Generator', 'X-Framework', 'X-Application']
            for h in random.sample(header_names, random.randint(2, 4)):
                headers[h] = f'pattern_{random.randint(1000, 9999)}'
            
            # 生成 script_src 规则
            script_src = [f'/js/lib/framework-{random.randint(100, 999)}.min.js' for _ in range(random.randint(3, 8))]
            
            # 生成 js 变量规则
            js_vars = [f'window.Framework{random.randint(100, 999)}' for _ in range(random.randint(2, 6))]
            
            # 生成 implies 依赖
            implies = [f'Dependency-{random.randint(100, 999)}' for _ in range(random.randint(1, 4))]
            
            # 生成 meta 规则
            meta = {}
            meta_names = ['generator', 'framework', 'application-name', 'author', 'description']
            for m in random.sample(meta_names, random.randint(2, 4)):
                meta[m] = f'meta_pattern_{random.randint(1000, 9999)}'
            
            # 生成 html 规则
            html = [f'<div class="framework-{random.randint(100, 999)}">' for _ in range(random.randint(3, 7))]
            
            description = random.choice(descriptions)
            website = f'https://www.example-framework-{random.randint(1000, 9999)}.com'
            cpe = f'cpe:/a:vendor:product:{random.randint(1, 10)}.{random.randint(0, 9)}.{random.randint(0, 9)}'
            
            batch_data.append((
                name, json.dumps(cats), json.dumps(cookies), json.dumps(headers),
                json.dumps(script_src), json.dumps(js_vars), json.dumps(implies),
                json.dumps(meta), json.dumps(html), description, website, cpe
            ))
            count += 1
        
        if batch_data:
            execute_values(cur, """
                INSERT INTO wappalyzer_fingerprint (
                    name, cats, cookies, headers, script_src, js, implies,
                    meta, html, description, website, cpe, created_at
                ) VALUES %s
                ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())")
        
        print(f"  ✓ 创建了 {count} 个 Wappalyzer 指纹\n")

    def create_fingers_fingerprints(self):
        """创建 Fingers 指纹数据"""
        print("🔍 创建 Fingers 指纹...")
        cur = self.conn.cursor()
        
        # 应用名称模板（长名称）
        name_templates = [
            'Apache-HTTP-Server-Web-Application-Platform-Open-Source-Software',
            'Nginx-High-Performance-Web-Server-Reverse-Proxy-Load-Balancer',
            'Microsoft-IIS-Internet-Information-Services-Windows-Web-Server',
            'Tomcat-Java-Servlet-Container-Apache-Application-Server-Platform',
            'WordPress-Content-Management-System-Blogging-Platform-PHP-MySQL',
            'Drupal-CMS-Content-Management-Framework-PHP-Community-Platform',
            'Joomla-Open-Source-CMS-Web-Content-Management-System-Framework',
            'Laravel-PHP-Framework-Web-Application-Development-MVC-Pattern',
            'Django-Python-Web-Framework-High-Level-MTV-Architecture-Pattern',
            'Ruby-on-Rails-Web-Application-Framework-MVC-Convention-Configuration',
            'Express-JS-Node-JS-Web-Application-Framework-Minimal-Flexible',
            'Spring-Boot-Java-Framework-Microservices-Enterprise-Application',
            'ASP-NET-Core-Cross-Platform-Web-Framework-Microsoft-Open-Source',
            'React-JavaScript-Library-Building-User-Interfaces-Facebook-Meta',
            'Vue-JS-Progressive-JavaScript-Framework-Web-Application-Development',
            'Angular-TypeScript-Platform-Framework-Web-Applications-Google',
            'jQuery-JavaScript-Library-DOM-Manipulation-Ajax-Event-Handling',
            'Bootstrap-CSS-Framework-Responsive-Mobile-First-Web-Development',
            'Tailwind-CSS-Utility-First-Framework-Rapid-UI-Development-Tool',
            'Docker-Container-Platform-Application-Deployment-Virtualization',
            'Kubernetes-Container-Orchestration-Platform-Cloud-Native-Apps',
            'Redis-In-Memory-Data-Structure-Store-Database-Cache-Broker',
            'MongoDB-Document-NoSQL-Database-Scalable-High-Performance',
            'PostgreSQL-Relational-Database-Management-System-Open-Source',
            'MySQL-Database-Management-System-Relational-Database-Oracle',
            'Elasticsearch-Search-Analytics-Engine-Distributed-RESTful-API',
            'RabbitMQ-Message-Broker-Advanced-Message-Queuing-Protocol',
            'Jenkins-Automation-Server-Continuous-Integration-Deployment',
            'GitLab-DevOps-Platform-Git-Repository-CI-CD-Pipeline-Management',
            'Grafana-Observability-Platform-Metrics-Visualization-Dashboard',
        ]
        
        # 标签模板
        tag_options = [
            ['web-server', 'http', 'apache', 'linux'],
            ['web-server', 'reverse-proxy', 'nginx', 'high-performance'],
            ['web-server', 'windows', 'microsoft', 'iis'],
            ['cms', 'php', 'wordpress', 'blog', 'mysql'],
            ['cms', 'php', 'drupal', 'content-management'],
            ['framework', 'php', 'laravel', 'mvc', 'modern'],
            ['framework', 'python', 'django', 'full-stack'],
            ['framework', 'ruby', 'rails', 'mvc', 'convention'],
            ['framework', 'javascript', 'nodejs', 'express', 'backend'],
            ['framework', 'java', 'spring', 'enterprise', 'microservices'],
            ['framework', 'dotnet', 'aspnet', 'microsoft', 'cross-platform'],
            ['library', 'javascript', 'react', 'frontend', 'ui'],
            ['framework', 'javascript', 'vue', 'progressive', 'reactive'],
            ['framework', 'typescript', 'angular', 'google', 'spa'],
            ['database', 'nosql', 'mongodb', 'document', 'json'],
            ['database', 'relational', 'postgresql', 'sql', 'open-source'],
            ['database', 'relational', 'mysql', 'sql', 'oracle'],
            ['cache', 'database', 'redis', 'in-memory', 'key-value'],
            ['search', 'analytics', 'elasticsearch', 'distributed', 'restful'],
            ['container', 'docker', 'virtualization', 'deployment'],
        ]
        
        # 规则模板
        rule_templates = [
            # favicon hash 规则
            [{'method': 'faviconhash', 'favicon': f'-{random.randint(1000000000, 9999999999)}'}],
            # keyword 规则
            [{'method': 'keyword', 'keyword': ['X-Powered-By', 'Server', 'X-Generator']}],
            # 混合规则
            [
                {'method': 'keyword', 'keyword': ['content="WordPress', 'wp-content/', 'wp-includes/']},
                {'method': 'faviconhash', 'favicon': f'-{random.randint(1000000000, 9999999999)}'}
            ],
            # header 规则
            [{'method': 'keyword', 'keyword': ['Server: nginx', 'X-Powered-By: PHP']}],
            # body 规则
            [{'method': 'keyword', 'keyword': ['<meta name="generator"', 'Powered by', 'Built with']}],
        ]
        
        # 端口模板
        port_options = [
            [80, 443],
            [80, 443, 8080, 8443],
            [80, 443, 8000, 8080, 8443],
            [3000, 3001, 5000],
            [8080, 8081, 8888, 9000],
            [443, 8443, 9443],
            [],  # 空数组
        ]
        
        count = 0
        batch_data = []
        
        for i in range(200):  # 生成 200 条 Fingers 指纹
            name = f'{random.choice(name_templates)}-{random.randint(1000, 9999)}'
            link = f'https://www.example-{random.randint(1000, 9999)}.com'
            rule = random.choice(rule_templates)
            tag = random.choice(tag_options)
            focus = random.choice([True, False])
            default_port = random.choice(port_options)
            
            batch_data.append((
                name, link, json.dumps(rule), json.dumps(tag), focus, json.dumps(default_port)
            ))
            count += 1
        
        if batch_data:
            execute_values(cur, """
                INSERT INTO fingers_fingerprint (name, link, rule, tag, focus, default_port, created_at)
                VALUES %s
                ON CONFLICT (name) DO NOTHING
            """, batch_data, template="(%s, %s, %s, %s, %s, %s, NOW())")
        
        print(f"  ✓ 创建了 {count} 个 Fingers 指纹\n")

    def create_fingerprinthub_fingerprints(self):
        """创建 FingerPrintHub 指纹数据"""
        print("🔍 创建 FingerPrintHub 指纹...")
        cur = self.conn.cursor()
        
        # FP ID 前缀
        fp_id_prefixes = [
            'web', 'cms', 'framework', 'server', 'database', 'cache', 'cdn',
            'waf', 'load-balancer', 'proxy', 'api', 'admin', 'monitoring'
        ]
        
        # 应用名称模板
        name_templates = [
            'Apache-HTTP-Server-Detection-Web-Platform-Fingerprint',
            'Nginx-Web-Server-Identification-Reverse-Proxy-Detection',
            'WordPress-CMS-Detection-Content-Management-System-Fingerprint',
            'Drupal-CMS-Identification-Web-Content-Platform-Detection',
            'Joomla-CMS-Detection-Web-Content-Management-Framework',
            'Laravel-Framework-Detection-PHP-Web-Application-Platform',
            'Django-Framework-Identification-Python-Web-Framework-Detection',
            'Spring-Boot-Framework-Detection-Java-Enterprise-Application',
            'React-Library-Detection-JavaScript-UI-Framework-Fingerprint',
            'Vue-JS-Framework-Detection-Progressive-JavaScript-Platform',
            'Angular-Framework-Identification-TypeScript-Web-Platform',
            'Docker-Container-Detection-Virtualization-Platform-Fingerprint',
            'Kubernetes-Orchestration-Detection-Container-Management-Platform',
            'Redis-Cache-Detection-In-Memory-Database-Fingerprint',
            'MongoDB-Database-Detection-NoSQL-Document-Store-Platform',
            'PostgreSQL-Database-Detection-Relational-Database-System',
            'MySQL-Database-Detection-Relational-Database-Management',
            'Elasticsearch-Search-Detection-Analytics-Engine-Platform',
            'Jenkins-CI-CD-Detection-Automation-Server-Platform',
            'GitLab-DevOps-Detection-Version-Control-Platform-System',
            'Grafana-Monitoring-Detection-Observability-Platform-Dashboard',
            'Prometheus-Monitoring-Detection-Time-Series-Database-System',
            'Kibana-Visualization-Detection-Data-Dashboard-Platform',
            'Cloudflare-CDN-Detection-Web-Application-Firewall-Platform',
            'Akamai-CDN-Detection-Content-Delivery-Network-Platform',
            'AWS-CloudFront-CDN-Detection-Amazon-Web-Services-Platform',
            'Microsoft-IIS-Detection-Internet-Information-Services-Server',
            'Tomcat-Server-Detection-Java-Servlet-Container-Platform',
            'JBoss-Server-Detection-Enterprise-Application-Platform',
            'WebLogic-Server-Detection-Oracle-Application-Server-Platform',
        ]
        
        # 作者模板
        authors = [
            'security-research-team', 'fingerprint-detection-group', 'web-security-lab',
            'cyber-threat-intelligence', 'vulnerability-research-team', 'security-automation-team',
            'open-source-security', 'community-contributors', 'detection-engineering-team'
        ]
        
        # 严重程度
        severities = ['info', 'low', 'medium', 'high', 'critical']
        
        # metadata 模板
        metadata_templates = [
            {
                'vendor': 'Apache Software Foundation',
                'product': 'Apache HTTP Server',
                'verified': True,
                'max-request': 1,
                'shodan-query': 'http.server:"Apache"'
            },
            {
                'vendor': 'Nginx Inc',
                'product': 'Nginx Web Server',
                'verified': True,
                'max-request': 1,
                'shodan-query': 'http.server:"nginx"'
            },
            {
                'vendor': 'WordPress',
                'product': 'WordPress CMS',
                'verified': True,
                'max-request': 2,
                'fofa-query': 'body="wp-content"'
            },
            {
                'vendor': 'Various',
                'product': 'Web Framework',
                'verified': False,
                'max-request': 1
            },
        ]
        
        # HTTP 规则模板
        http_templates = [
            [{
                'method': 'GET',
                'path': ['{{BaseURL}}'],
                'matchers': [{
                    'type': 'word',
                    'words': ['Server: nginx', 'X-Powered-By'],
                    'condition': 'or'
                }]
            }],
            [{
                'method': 'GET',
                'path': ['{{BaseURL}}/admin'],
                'matchers': [{
                    'type': 'status',
                    'status': [200, 401, 403]
                }]
            }],
            [{
                'method': 'GET',
                'path': ['{{BaseURL}}'],
                'matchers': [{
                    'type': 'word',
                    'words': ['wp-content', 'wordpress'],
                    'part': 'body',
                    'condition': 'and'
                }]
            }],
        ]
        
        # source_file 模板
        source_files = [
            'fingerprints/web-servers/apache.yaml',
            'fingerprints/web-servers/nginx.yaml',
            'fingerprints/cms/wordpress.yaml',
            'fingerprints/cms/drupal.yaml',
            'fingerprints/frameworks/laravel.yaml',
            'fingerprints/frameworks/django.yaml',
            'fingerprints/frameworks/spring.yaml',
            'fingerprints/databases/mongodb.yaml',
            'fingerprints/databases/postgresql.yaml',
            'fingerprints/cache/redis.yaml',
        ]
        
        count = 0
        batch_data = []
        
        for i in range(200):  # 生成 200 条 FingerPrintHub 指纹
            fp_id = f'{random.choice(fp_id_prefixes)}-detection-{random.randint(10000, 99999)}'
            name = f'{random.choice(name_templates)}-{random.randint(1000, 9999)}'
            author = random.choice(authors)
            tags = ','.join(random.sample(['web', 'cms', 'framework', 'server', 'detection', 'fingerprint'], random.randint(2, 4)))
            severity = random.choice(severities)
            metadata = random.choice(metadata_templates).copy()
            http = random.choice(http_templates)
            source_file = random.choice(source_files)
            
            batch_data.append((
                fp_id, name, author, tags, severity,
                json.dumps(metadata), json.dumps(http), source_file
            ))
            count += 1
        
        if batch_data:
            execute_values(cur, """
                INSERT INTO fingerprinthub_fingerprint (
                    fp_id, name, author, tags, severity, metadata, http, source_file, created_at
                )
                VALUES %s
                ON CONFLICT (fp_id) DO NOTHING
            """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, NOW())")
        
        print(f"  ✓ 创建了 {count} 个 FingerPrintHub 指纹\n")

    def create_arl_fingerprints(self):
        """创建 ARL 指纹数据"""
        print("🔍 创建 ARL 指纹...")
        cur = self.conn.cursor()
        
        # 应用名称模板
        name_templates = [
            'Apache-HTTP-Server-Web-Platform-Application-Server',
            'Nginx-High-Performance-Web-Server-Reverse-Proxy',
            'Microsoft-IIS-Internet-Information-Services-Server',
            'WordPress-Content-Management-System-Blogging-Platform',
            'Drupal-Open-Source-CMS-Content-Management-Framework',
            'Joomla-Web-Content-Management-System-Framework',
            'Laravel-PHP-Web-Application-Framework-MVC-Pattern',
            'Django-Python-Web-Framework-MTV-Architecture',
            'Spring-Boot-Java-Enterprise-Application-Framework',
            'Express-Node-JS-Web-Application-Framework-Minimal',
            'React-JavaScript-Library-User-Interface-Components',
            'Vue-JS-Progressive-JavaScript-Framework-Reactive',
            'Angular-TypeScript-Web-Application-Framework-Google',
            'Docker-Container-Platform-Application-Deployment',
            'Kubernetes-Container-Orchestration-Cloud-Native',
            'Redis-In-Memory-Database-Cache-Message-Broker',
            'MongoDB-Document-NoSQL-Database-Scalable-Platform',
            'PostgreSQL-Relational-Database-Management-System',
            'MySQL-Database-Management-Relational-Database-Oracle',
            'Elasticsearch-Search-Analytics-Engine-Distributed',
            'Jenkins-Automation-Server-Continuous-Integration',
            'GitLab-DevOps-Platform-Git-Repository-CI-CD-Pipeline',
            'Grafana-Observability-Metrics-Visualization-Dashboard',
            'Prometheus-Monitoring-Time-Series-Database-Alerting',
            'RabbitMQ-Message-Broker-AMQP-Protocol-Queue-System',
            'Tomcat-Java-Servlet-Container-Application-Server',
            'JBoss-Enterprise-Application-Platform-Java-EE-Server',
            'WebLogic-Oracle-Application-Server-Java-Enterprise',
            'Cloudflare-CDN-DDoS-Protection-Web-Firewall-Platform',
            'Amazon-CloudFront-CDN-Content-Delivery-Network-AWS',
        ]
        
        # 规则表达式模板
        rule_templates = [
            # 简单规则
            'header="Server" && header="nginx"',
            'body="WordPress" && body="wp-content"',
            'title="Admin Panel" || title="Dashboard"',
            'header="X-Powered-By" && header="PHP"',
            'body="Powered by" && body="Laravel"',
            # 复杂规则
            '(header="Server" && header="Apache") || (body="Apache" && title="Apache")',
            '(body="wp-content" && body="wp-includes") || (header="X-Powered-By" && header="WordPress")',
            '(title="Jenkins" && body="Jenkins") || (header="X-Jenkins" && status="200")',
            '(body="Spring" && body="Whitelabel Error Page") || header="X-Application-Context"',
            '(body="React" && body="react-dom") || (body="__REACT" && body="reactRoot")',
            # 带状态码规则
            'status="200" && body="nginx" && title="Welcome to nginx"',
            'status="403" && body="Apache" && header="Server"',
            'status="401" && header="WWW-Authenticate" && body="Unauthorized"',
            # 多条件规则
            'header="Server" && (body="PHP" || body="Laravel" || body="Symfony")',
            'body="Django" && (header="X-Frame-Options" || body="csrfmiddlewaretoken")',
            '(title="GitLab" && body="gitlab") || (header="X-GitLab-Feature-Category")',
            # JSON API 规则
            'body="{\\"version\\"" && body="api" && header="Content-Type"',
            'status="200" && body="swagger" && body="openapi"',
            # 错误页面规则
            'status="404" && body="Not Found" && body="nginx"',
            'status="500" && body="Internal Server Error" && body="Apache"',
        ]
        
        count = 0
        batch_data = []
        
        for i in range(200):  # 生成 200 条 ARL 指纹
            name = f'{random.choice(name_templates)}-{random.randint(1000, 9999)}'
            rule = random.choice(rule_templates)
            
            batch_data.append((name, rule))
            count += 1
        
        if batch_data:
            execute_values(cur, """
                INSERT INTO arl_fingerprint (name, rule, created_at)
                VALUES %s
                ON CONFLICT (name) DO NOTHING
            """, batch_data, template="(%s, %s, NOW())")
        
        print(f"  ✓ 创建了 {count} 个 ARL 指纹\n")


class MillionDataGenerator:
    """
    百万级数据生成器 - 用于测试 Dashboard 卡片溢出
    
    生成数据量：
    - 子域名: 200,000
    - 网站: 200,000
    - 端点: 200,000
    - IP (host_port_mapping): 200,000
    - 漏洞: 200,000 (critical: 50k, high: 50k, medium: 50k, low: 30k, info: 20k)
    - 目标: 1,000
    - 历史统计: 7天
    """
    
    def __init__(self, clear: bool = False):
        self.conn = psycopg2.connect(**DB_CONFIG)
        self.conn.autocommit = False
        self.clear = clear
        
    def run(self):
        try:
            if self.clear:
                print("🗑️  清除现有数据...")
                self.clear_data()
                
            print("🚀 开始生成百万级测试数据(用于 Dashboard 溢出测试)...\n")
            
            target_ids = self.create_targets()
            self.create_subdomains(target_ids)
            self.create_websites(target_ids)
            self.create_endpoints(target_ids)
            self.create_host_port_mappings(target_ids)
            self.create_vulnerabilities(target_ids)
            self.create_statistics_history()  # 生成趋势图数据
            self.update_asset_statistics()
            
            self.conn.commit()
            print("\n✅ 百万级测试数据生成完成！")
            print("📊 请刷新 Dashboard 页面查看效果")
        except Exception as e:
            self.conn.rollback()
            print(f"\n❌ 生成失败: {e}")
            raise
        finally:
            self.conn.close()

    def clear_data(self):
        """清除所有测试数据"""
        cur = self.conn.cursor()
        tables = [
            'vulnerability_snapshot', 'host_port_mapping_snapshot', 'directory_snapshot',
            'endpoint_snapshot', 'website_snapshot', 'subdomain_snapshot',
            'vulnerability', 'host_port_mapping', 'directory', 'endpoint',
            'website', 'subdomain', 'scheduled_scan', 'scan',
            'organization_targets', 'target', 'organization',
            'statistics_history', 'asset_statistics',
        ]
        for table in tables:
            try:
                cur.execute(f"DELETE FROM {table}")
            except Exception:
                pass  # 表可能不存在
        self.conn.commit()
        print("  ✓ 数据清除完成\n")

    def create_targets(self) -> list:
        """创建 1000 个扫描目标"""
        print("🎯 创建扫描目标 (1,000 个)...")
        cur = self.conn.cursor()
        
        suffix = random.randint(1000, 9999)
        domains = [
            'example', 'test', 'demo', 'staging', 'production', 'api', 'app', 'web',
            'portal', 'admin', 'dashboard', 'service', 'platform', 'cloud', 'data',
            'analytics', 'security', 'enterprise', 'global', 'internal', 'external'
        ]
        tlds = ['.com', '.io', '.net', '.org', '.dev', '.app', '.cloud', '.tech']
        
        ids = []
        for i in range(1000):
            domain = f'{random.choice(domains)}-{suffix}-{i:04d}{random.choice(tlds)}'
            cur.execute("""
                INSERT INTO target (name, type, created_at, deleted_at)
                VALUES (%s, 'domain', NOW() - INTERVAL '%s days', NULL)
                ON CONFLICT DO NOTHING
                RETURNING id
            """, (domain, random.randint(0, 365)))
            row = cur.fetchone()
            if row:
                ids.append(row[0])
                
        print(f"  ✓ 创建了 {len(ids)} 个扫描目标\n")
        return ids

    def create_subdomains(self, target_ids: list):
        """创建 200,000 个子域名"""
        print("🌐 创建子域名 (200,000 个)...")
        cur = self.conn.cursor()
        
        prefixes = [
            'api', 'admin', 'portal', 'dashboard', 'app', 'mobile', 'staging', 'dev',
            'test', 'qa', 'uat', 'beta', 'alpha', 'demo', 'sandbox', 'internal',
            'secure', 'auth', 'login', 'sso', 'oauth', 'identity', 'accounts',
            'mail', 'smtp', 'imap', 'webmail', 'ftp', 'sftp', 'files', 'storage',
            'cdn', 'static', 'assets', 'media', 'db', 'database', 'mysql', 'postgres',
            'redis', 'mongo', 'elastic', 'vpn', 'remote', 'gateway', 'proxy',
            'monitoring', 'metrics', 'grafana', 'prometheus', 'kibana', 'logs',
            'jenkins', 'ci', 'cd', 'gitlab', 'jira', 'confluence', 'kubernetes', 'k8s',
            'www', 'www2', 'www3', 'ns1', 'ns2', 'mx', 'mx1', 'mx2', 'autodiscover',
        ]
        secondary = ['', 'prod-', 'dev-', 'staging-', 'test-', 'us-', 'eu-', 'ap-']
        
        cur.execute("SELECT id, name FROM target WHERE type = 'domain' AND deleted_at IS NULL")
        domain_targets = cur.fetchall()
        
        count = 0
        batch_data = []
        batch_size = 50000  # 增加批量大小
        target_count = 200000
        per_target = target_count // len(domain_targets) + 1
        
        for target_id, target_name in domain_targets:
            for i in range(per_target):
                if count >= target_count:
                    break
                prefix = random.choice(prefixes)
                sec = random.choice(secondary)
                subdomain_name = f'{sec}{prefix}-{i:04d}.{target_name}'
                batch_data.append((subdomain_name, target_id, random.randint(0, 90)))
                count += 1
                
                if len(batch_data) >= batch_size:
                    execute_values(cur, """
                        INSERT INTO subdomain (name, target_id, created_at)
                        VALUES %s ON CONFLICT DO NOTHING
                    """, batch_data, template="(%s, %s, NOW() - INTERVAL '%s days')")
                    self.conn.commit()  # 每批次提交
                    batch_data = []
                    print(f"    ✓ {count:,} / {target_count:,}")
            if count >= target_count:
                break
        
        if batch_data:
            execute_values(cur, """
                INSERT INTO subdomain (name, target_id, created_at)
                VALUES %s ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, NOW() - INTERVAL '%s days')")
            self.conn.commit()
                
        print(f"  ✓ 创建了 {count:,} 个子域名\n")

    def create_websites(self, target_ids: list):
        """创建 200,000 个网站"""
        print("🌍 创建网站 (200,000 个)...")
        cur = self.conn.cursor()
        
        cur.execute("SELECT id, name FROM target WHERE type = 'domain' AND deleted_at IS NULL")
        domain_targets = cur.fetchall()
        
        count = 0
        batch_data = []
        batch_size = 50000  # 增加批量大小
        target_count = 200000
        per_target = target_count // len(domain_targets) + 1
        
        for target_id, target_name in domain_targets:
            for i in range(per_target):
                if count >= target_count:
                    break
                # 生成固定 245 长度的 URL
                url = generate_fixed_length_url(target_name, length=245, path_hint=f'million-website/{i:06d}')
                
                batch_data.append((
                    url, target_id, target_name, f'Website Title {count}',
                    'nginx/1.24.0', ['React', 'Node.js'],
                    random.choice([200, 301, 403]), random.randint(1000, 50000),
                    'text/html', '', '<!DOCTYPE html><html></html>'
                ))
                count += 1
                
                if len(batch_data) >= batch_size:
                    execute_values(cur, """
                        INSERT INTO website (url, target_id, host, title, webserver, tech, 
                            status_code, content_length, content_type, location, response_body, 
                            vhost, response_headers, created_at)
                        VALUES %s ON CONFLICT DO NOTHING
                    """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, '', NOW())")
                    self.conn.commit()
                    batch_data = []
                    print(f"    ✓ {count:,} / {target_count:,}")
            if count >= target_count:
                break
        
        if batch_data:
            execute_values(cur, """
                INSERT INTO website (url, target_id, host, title, webserver, tech, 
                    status_code, content_length, content_type, location, response_body, 
                    vhost, response_headers, created_at)
                VALUES %s ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NULL, '', NOW())")
            self.conn.commit()
                
        print(f"  ✓ 创建了 {count:,} 个网站\n")

    def create_endpoints(self, target_ids: list):
        """创建 200,000 个端点"""
        print("🔗 创建端点 (200,000 个)...")
        cur = self.conn.cursor()
        
        paths = ['/api/v1/', '/api/v2/', '/admin/', '/portal/', '/graphql/', '/health/', '/metrics/']
        
        # 100字符长度的标题
        titles = [
            'Enterprise API Gateway - RESTful Service Documentation with OpenAPI 3.0 Specification and Interactive',
            'User Authentication Service - OAuth 2.0 and SAML 2.0 Single Sign-On Integration Platform Dashboard',
            'Payment Processing Gateway - PCI-DSS Compliant Transaction Management System Administration Panel',
            'Content Delivery Network - Global Edge Cache Management and Real-time Analytics Dashboard Interface',
            'Database Administration Console - PostgreSQL Cluster Management with Automated Backup and Recovery',
        ]
        
        # 扩展的技术栈列表
        all_techs = [
            'React 18.2.0', 'Vue.js 3.4', 'Angular 17.1', 'Next.js 14.0', 'Node.js 20.10',
            'Express 4.18', 'Python 3.12', 'Django 5.0', 'FastAPI 0.109', 'Go 1.21',
            'PostgreSQL 16.1', 'MySQL 8.2', 'MongoDB 7.0', 'Redis 7.2', 'Elasticsearch 8.11',
            'Kubernetes 1.28', 'Docker 24.0', 'Nginx 1.25', 'GraphQL 16.8', 'JWT',
        ]
        
        # 扩展的 tags
        all_tags = [
            'debug', 'config', 'api', 'json', 'upload', 'file', 'admin', 'auth',
            'secrets', 'credentials', 'backup', 'archive', 'trace', 'log', 'error',
            'security', 'vulnerability', 'payment', 'user', 'internal', 'private',
        ]
        
        cur.execute("SELECT id, name FROM target WHERE type = 'domain' AND deleted_at IS NULL")
        domain_targets = cur.fetchall()
        
        count = 0
        batch_data = []
        batch_size = 50000  # 增加批量大小
        target_count = 200000
        per_target = target_count // len(domain_targets) + 1
        
        for target_id, target_name in domain_targets:
            for i in range(per_target):
                if count >= target_count:
                    break
                # 生成固定 245 长度的 URL
                url = generate_fixed_length_url(target_name, length=245, path_hint=f'million-endpoint/{i:06d}')
                
                # 生成 100 字符的标题
                title = random.choice(titles)
                
                # 生成 10-20 个技术
                num_techs = random.randint(10, 20)
                tech_list = random.sample(all_techs, min(num_techs, len(all_techs)))
                
                # 生成 10-20 个 tags
                num_tags = random.randint(10, 20)
                tags = random.sample(all_tags, min(num_tags, len(all_tags)))
                
                batch_data.append((
                    url, target_id, target_name, title,
                    'nginx/1.24.0', random.choice([200, 201, 401, 403]),
                    random.randint(100, 5000), 'application/json',
                    tech_list, '', '{"status":"ok"}', None, tags
                ))
                count += 1
                
                if len(batch_data) >= batch_size:
                    execute_values(cur, """
                        INSERT INTO endpoint (url, target_id, host, title, webserver, status_code,
                            content_length, content_type, tech, location, response_body, vhost, 
                            matched_gf_patterns, response_headers, created_at)
                        VALUES %s ON CONFLICT DO NOTHING
                    """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, '', NOW())")
                    self.conn.commit()
                    batch_data = []
                    print(f"    ✓ {count:,} / {target_count:,}")
            if count >= target_count:
                break
        
        if batch_data:
            execute_values(cur, """
                INSERT INTO endpoint (url, target_id, host, title, webserver, status_code,
                    content_length, content_type, tech, location, response_body, vhost, 
                    matched_gf_patterns, response_headers, created_at)
                VALUES %s ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, '', NOW())")
            self.conn.commit()
                
        print(f"  ✓ 创建了 {count:,} 个端点\n")

    def create_host_port_mappings(self, target_ids: list):
        """创建 200,000 个主机端口映射(用于 IP 统计)"""
        print("🔌 创建主机端口映射 (200,000 个)...")
        cur = self.conn.cursor()
        
        ports = [22, 80, 443, 3306, 5432, 6379, 8080, 8443, 9000, 9200, 27017]
        
        cur.execute("SELECT id, name FROM target WHERE type = 'domain' AND deleted_at IS NULL")
        domain_targets = cur.fetchall()
        
        count = 0
        batch_data = []
        batch_size = 50000  # 增加批量大小
        target_count = 200000
        per_target = target_count // len(domain_targets) + 1
        
        for target_id, target_name in domain_targets:
            for i in range(per_target):
                if count >= target_count:
                    break
                ip = f'192.168.{random.randint(1, 254)}.{random.randint(1, 254)}'
                port = random.choice(ports)
                
                batch_data.append((target_id, target_name, ip, port))
                count += 1
                
                if len(batch_data) >= batch_size:
                    execute_values(cur, """
                        INSERT INTO host_port_mapping (target_id, host, ip, port, created_at)
                        VALUES %s ON CONFLICT DO NOTHING
                    """, batch_data, template="(%s, %s, %s, %s, NOW())")
                    self.conn.commit()
                    batch_data = []
                    print(f"    ✓ {count:,} / {target_count:,}")
            if count >= target_count:
                break
        
        if batch_data:
            execute_values(cur, """
                INSERT INTO host_port_mapping (target_id, host, ip, port, created_at)
                VALUES %s ON CONFLICT DO NOTHING
            """, batch_data, template="(%s, %s, %s, %s, NOW())")
            self.conn.commit()
                
        print(f"  ✓ 创建了 {count:,} 个主机端口映射\n")

    def create_vulnerabilities(self, target_ids: list):
        """创建 200,000 个漏洞 (critical: 50k, high: 50k, medium: 50k, low: 30k, info: 20k)"""
        print("🐛 创建漏洞 (200,000 个)...")
        cur = self.conn.cursor()
        
        vuln_types = [
            'sql-injection-authentication-bypass-vulnerability-',
            'cross-site-scripting-xss-stored-persistent-attack-',
            'server-side-request-forgery-ssrf-internal-access--',
            'remote-code-execution-rce-command-injection-flaw--',
            'local-file-inclusion-lfi-path-traversal-exploit---',
            'xml-external-entity-xxe-injection-vulnerability---',
            'cross-site-request-forgery-csrf-token-validation--',
            'insecure-direct-object-reference-idor-access-ctrl-',
        ]
        sources = [
            'nuclei-vulnerability-scanner--',
            'dalfox-xss-parameter-analysis-',
            'sqlmap-sql-injection-testing--',
            'burp-suite-professional-scan--',
            'owasp-zap-security-scanner----',
        ]
        
        # 按严重程度分配数量
        severity_counts = {
            'critical': 50000,
            'high': 50000,
            'medium': 50000,
            'low': 30000,
            'info': 20000,
        }
        
        cur.execute("SELECT id, name FROM target WHERE type = 'domain' AND deleted_at IS NULL")
        domain_targets = cur.fetchall()
        
        count = 0
        batch_data = []
        batch_size = 50000  # 增加批量大小
        
        for severity, target_count in severity_counts.items():
            print(f"    创建 {severity} 级别漏洞: {target_count:,} 个")
            cvss_ranges = {
                'critical': (9.0, 10.0), 'high': (7.0, 8.9), 'medium': (4.0, 6.9),
                'low': (0.1, 3.9), 'info': (0.0, 0.0)
            }
            cvss_range = cvss_ranges.get(severity, (0.0, 10.0))
            
            severity_count = 0
            per_target = target_count // len(domain_targets) + 1
            
            for target_id, target_name in domain_targets:
                for i in range(per_target):
                    if severity_count >= target_count:
                        break
                    
                    cvss_score = round(random.uniform(*cvss_range), 1)
                    # 生成固定 245 长度的 URL
                    url = generate_fixed_length_url(target_name, length=245, path_hint=f'million-vuln/{severity_count:06d}')
                    
                    # 生成固定 300 长度的描述
                    description = generate_fixed_length_text(length=300, text_type='description')
                    
                    batch_data.append((
                        target_id, url, random.choice(vuln_types), severity,
                        random.choice(sources), cvss_score,
                        description,
                        json.dumps({'template': f'CVE-2024-{random.randint(10000, 99999)}'})
                    ))
                    severity_count += 1
                    count += 1
                    
                    if len(batch_data) >= batch_size:
                        execute_values(cur, """
                            INSERT INTO vulnerability (target_id, url, vuln_type, severity, source,
                                cvss_score, description, raw_output, created_at)
                            VALUES %s
                        """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, NOW())")
                        self.conn.commit()
                        batch_data = []
                        print(f"      ✓ {severity_count:,} / {target_count:,}")
                if severity_count >= target_count:
                    break
        
        if batch_data:
            execute_values(cur, """
                INSERT INTO vulnerability (target_id, url, vuln_type, severity, source,
                    cvss_score, description, raw_output, created_at)
                VALUES %s
            """, batch_data, template="(%s, %s, %s, %s, %s, %s, %s, %s, NOW())")
            self.conn.commit()
                
        print(f"  ✓ 创建了 {count:,} 个漏洞\n")

    def create_statistics_history(self):
        """创建 7 天的统计历史数据(用于趋势图)"""
        print("📈 创建统计历史数据 (7 天)...")
        cur = self.conn.cursor()
        
        # 先清除旧的历史数据
        cur.execute("DELETE FROM statistics_history")
        
        # 生成 7 天的历史数据，数值逐渐增长
        base_values = {
            'total_targets': 800,
            'total_subdomains': 150000,
            'total_ips': 150000,
            'total_endpoints': 150000,
            'total_websites': 150000,
            'total_vulns': 150000,
        }
        
        for i in range(7):
            date = datetime.now().date() - timedelta(days=6-i)
            growth_factor = 1 + (i * 0.05)  # 每天增长 5%
            
            total_targets = int(base_values['total_targets'] * growth_factor)
            total_subdomains = int(base_values['total_subdomains'] * growth_factor)
            total_ips = int(base_values['total_ips'] * growth_factor)
            total_endpoints = int(base_values['total_endpoints'] * growth_factor)
            total_websites = int(base_values['total_websites'] * growth_factor)
            total_vulns = int(base_values['total_vulns'] * growth_factor)
            total_assets = total_subdomains + total_ips + total_endpoints + total_websites
            
            cur.execute("""
                INSERT INTO statistics_history (
                    date, total_targets, total_subdomains, total_ips, total_endpoints,
                    total_websites, total_vulns, total_assets, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (date) DO UPDATE SET
                    total_targets = EXCLUDED.total_targets,
                    total_subdomains = EXCLUDED.total_subdomains,
                    total_ips = EXCLUDED.total_ips,
                    total_endpoints = EXCLUDED.total_endpoints,
                    total_websites = EXCLUDED.total_websites,
                    total_vulns = EXCLUDED.total_vulns,
                    total_assets = EXCLUDED.total_assets,
                    updated_at = NOW()
            """, (date, total_targets, total_subdomains, total_ips, total_endpoints,
                  total_websites, total_vulns, total_assets))
        
        print(f"  ✓ 创建了 7 天的统计历史数据\n")

    def update_asset_statistics(self):
        """更新资产统计表(Dashboard 卡片使用)"""
        print("📊 更新资产统计表...")
        cur = self.conn.cursor()
        
        # 统计实际数据
        cur.execute("SELECT COUNT(*) FROM target WHERE deleted_at IS NULL")
        total_targets = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM subdomain")
        total_subdomains = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(DISTINCT ip) FROM host_port_mapping")
        total_ips = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM endpoint")
        total_endpoints = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM website")
        total_websites = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM vulnerability")
        total_vulns = cur.fetchone()[0]
        
        total_assets = total_subdomains + total_ips + total_endpoints + total_websites
        
        # 更新或插入统计数据
        cur.execute("""
            INSERT INTO asset_statistics (
                id, total_targets, total_subdomains, total_ips, total_endpoints,
                total_websites, total_vulns, total_assets,
                prev_targets, prev_subdomains, prev_ips, prev_endpoints,
                prev_websites, prev_vulns, prev_assets,
                updated_at
            ) VALUES (
                1, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                total_targets = EXCLUDED.total_targets,
                total_subdomains = EXCLUDED.total_subdomains,
                total_ips = EXCLUDED.total_ips,
                total_endpoints = EXCLUDED.total_endpoints,
                total_websites = EXCLUDED.total_websites,
                total_vulns = EXCLUDED.total_vulns,
                total_assets = EXCLUDED.total_assets,
                prev_targets = asset_statistics.total_targets,
                prev_subdomains = asset_statistics.total_subdomains,
                prev_ips = asset_statistics.total_ips,
                prev_endpoints = asset_statistics.total_endpoints,
                prev_websites = asset_statistics.total_websites,
                prev_vulns = asset_statistics.total_vulns,
                prev_assets = asset_statistics.total_assets,
                updated_at = NOW()
        """, (total_targets, total_subdomains, total_ips, total_endpoints,
              total_websites, total_vulns, total_assets,
              int(total_targets * 0.9), int(total_subdomains * 0.9), int(total_ips * 0.9),
              int(total_endpoints * 0.9), int(total_websites * 0.9), int(total_vulns * 0.9),
              int(total_assets * 0.9)))
        
        print(f"  ✓ 统计数据已更新:")
        print(f"    - 目标: {total_targets:,}")
        print(f"    - 子域名: {total_subdomains:,}")
        print(f"    - IP: {total_ips:,}")
        print(f"    - 端点: {total_endpoints:,}")
        print(f"    - 网站: {total_websites:,}")
        print(f"    - 漏洞: {total_vulns:,}")
        print(f"    - 总资产: {total_assets:,}\n")


def main():
    parser = argparse.ArgumentParser(description="直接通过 SQL 生成测试数据")
    parser.add_argument('--clear', action='store_true', help='清除现有数据后重新生成')
    parser.add_argument('--million', action='store_true', help='生成百万级数据(用于 Dashboard 溢出测试)')
    args = parser.parse_args()
    
    if args.million:
        generator = MillionDataGenerator(clear=args.clear)
    else:
        generator = TestDataGenerator(clear=args.clear)
    generator.run()


if __name__ == "__main__":
    main()
