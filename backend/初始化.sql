-- Xingra 数据库初始化脚本
-- Drop existing tables if they exist
DROP TABLE IF EXISTS workflow_executions CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS scan_results CASCADE;
DROP TABLE IF EXISTS scan_tasks CASCADE;
DROP TABLE IF EXISTS sub_domains CASCADE;
DROP TABLE IF EXISTS organization_main_domains CASCADE;
DROP TABLE IF EXISTS workflow_components CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS main_domains CASCADE;

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE main_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    main_domain_name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE organization_main_domains (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    main_domain_id UUID NOT NULL REFERENCES main_domains(id) ON DELETE CASCADE,
    PRIMARY KEY (organization_id, main_domain_id)
);

CREATE TABLE sub_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_domain_name VARCHAR(255) NOT NULL,
    main_domain_id UUID NOT NULL REFERENCES main_domains(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'unknown',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE (sub_domain_name, main_domain_id)
);

CREATE TABLE scan_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    main_domain_id UUID NOT NULL REFERENCES main_domains(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE scan_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_task_id UUID NOT NULL REFERENCES scan_tasks(id) ON DELETE CASCADE,
    result_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE workflow_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'Terminal',
    command_template TEXT NOT NULL,
    placeholders JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    workflow_data JSONB NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    execution_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    input_parameters JSONB,
    result_summary TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Dummy Data

-- Organizations
INSERT INTO organizations (id, name, description, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'Example Org 1', 'Description for Org 1', NOW()),
    ('00000000-0000-0000-0000-000000000002', 'Example Org 2', 'Description for Org 2', NOW()),
    ('00000000-0000-0000-0000-000000000003', 'Tech Solutions Inc.', 'Leading tech solutions provider.', NOW()),
    ('00000000-0000-0000-0000-000000000004', 'Global Innovations Ltd.', 'Innovating for a better future.', NOW()),
    ('00000000-0000-0000-0000-000000000005', 'Future Systems Corp.', 'Specializing in advanced AI systems.', NOW()),
    ('00000000-0000-0000-0000-000000000006', 'Data Security Group', 'Specializing in data protection.', NOW()),
    ('00000000-0000-0000-0000-000000000007', 'Cyber Defense Co.', 'Advanced cybersecurity solutions.', NOW());

-- Main Domains
INSERT INTO main_domains (id, main_domain_name, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000008', 'example1.com', NOW()),
    ('00000000-0000-0000-0000-000000000009', 'example2.com', NOW()),
    ('00000000-0000-0000-0000-00000000000a', 'xingra.io', NOW()),
    ('00000000-0000-0000-0000-00000000000b', 'globalsolutions.com', NOW()),
    ('00000000-0000-0000-0000-00000000000c', 'innovate.net', NOW()),
    ('00000000-0000-0000-0000-00000000000d', 'securitycorp.com', NOW()),
    ('00000000-0000-0000-0000-00000000000e', 'cyberdefense.org', NOW());

-- Organization Main Domains (Associating organizations with main domains)
INSERT INTO organization_main_domains (organization_id, main_domain_id)
VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000008'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000009'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000008'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000b'),
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000b'),
    ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000c'),
    ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-00000000000d'),
    ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-00000000000e');

-- Sub Domains
INSERT INTO sub_domains (sub_domain_name, main_domain_id, status, created_at, updated_at)
VALUES
    -- example1.com 子域名 (关联到组织1和2)
    ('www.example1.com', '00000000-0000-0000-0000-000000000008', 'active', NOW(), NOW()),
    ('blog.example1.com', '00000000-0000-0000-0000-000000000008', 'unknown', NOW(), NOW()),
    ('mail.example1.com', '00000000-0000-0000-0000-000000000008', 'active', NOW(), NOW()),
    ('admin.example1.com', '00000000-0000-0000-0000-000000000008', 'active', NOW(), NOW()),
    ('cdn.example1.com', '00000000-0000-0000-0000-000000000008', 'active', NOW(), NOW()),
    ('ftp.example1.com', '00000000-0000-0000-0000-000000000008', 'inactive', NOW(), NOW()),

    -- example2.com 子域名 (关联到组织1)
    ('app.example2.com', '00000000-0000-0000-0000-000000000009', 'active', NOW(), NOW()),
    ('api.example2.com', '00000000-0000-0000-0000-000000000009', 'active', NOW(), NOW()),
    ('test.example2.com', '00000000-0000-0000-0000-000000000009', 'unknown', NOW(), NOW()),
    ('staging.example2.com', '00000000-0000-0000-0000-000000000009', 'inactive', NOW(), NOW()),

    -- xingra.io 子域名 (关联到组织1和3)
    ('api.xingra.io', '00000000-0000-0000-0000-00000000000a', 'active', NOW(), NOW()),
    ('dev.xingra.io', '00000000-0000-0000-0000-00000000000a', 'unknown', NOW(), NOW()),
    ('www.xingra.io', '00000000-0000-0000-0000-00000000000a', 'active', NOW(), NOW()),
    ('dashboard.xingra.io', '00000000-0000-0000-0000-00000000000a', 'active', NOW(), NOW()),
    ('docs.xingra.io', '00000000-0000-0000-0000-00000000000a', 'active', NOW(), NOW()),

    -- globalsolutions.com 子域名 (关联到组织3和4)
    ('assets.globalsolutions.com', '00000000-0000-0000-0000-00000000000b', 'active', NOW(), NOW()),
    ('portal.globalsolutions.com', '00000000-0000-0000-0000-00000000000b', 'active', NOW(), NOW()),
    ('support.globalsolutions.com', '00000000-0000-0000-0000-00000000000b', 'active', NOW(), NOW()),

    -- innovate.net 子域名 (关联到组织2和5)
    ('beta.innovate.net', '00000000-0000-0000-0000-00000000000c', 'inactive', NOW(), NOW()),
    ('research.innovate.net', '00000000-0000-0000-0000-00000000000c', 'active', NOW(), NOW()),
    ('labs.innovate.net', '00000000-0000-0000-0000-00000000000c', 'unknown', NOW(), NOW()),

    -- securitycorp.com 子域名 (关联到组织6)
    ('portal.securitycorp.com', '00000000-0000-0000-0000-00000000000d', 'active', NOW(), NOW()),
    ('vault.securitycorp.com', '00000000-0000-0000-0000-00000000000d', 'active', NOW(), NOW()),
    ('monitor.securitycorp.com', '00000000-0000-0000-0000-00000000000d', 'active', NOW(), NOW()),

    -- cyberdefense.org 子域名 (关联到组织7)
    ('vpn.cyberdefense.org', '00000000-0000-0000-0000-00000000000e', 'active', NOW(), NOW()),
    ('shield.cyberdefense.org', '00000000-0000-0000-0000-00000000000e', 'active', NOW(), NOW()),
    ('alert.cyberdefense.org', '00000000-0000-0000-0000-00000000000e', 'unknown', NOW(), NOW());

-- Scan Tasks
INSERT INTO scan_tasks (id, organization_id, main_domain_id, status, created_at, updated_at)
VALUES
    ('00000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000008', 'completed', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000009', 'running', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000008', 'pending', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 'completed', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000b', 'running', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000c', 'failed', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-00000000000d', 'pending', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-00000000000e', 'completed', NOW(), NOW());

-- Scan Results
INSERT INTO scan_results (scan_task_id, result_summary, created_at, updated_at)
VALUES
    ('00000000-0000-0000-0000-00000000000f', 'Found 6 subdomains for example1.com and 2 open ports.', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000010', 'Discovered 4 subdomains for example2.com and 3 vulnerabilities.', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000011', 'Found 6 subdomains for example1.com: ongoing scan.', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000012', 'Completed scan with 5 xingra.io subdomains found.', NOW(), NOW());

-- Workflow Components
INSERT INTO workflow_components (id, name, description, category, icon, command_template, placeholders, status, created_at, updated_at)
VALUES
    ('00000000-0000-0000-0000-000000000017', 'Subfinder 子域名发现', '快速发现目标域名的所有子域名，支持多个数据源和被动扫描模式，是信息收集阶段的重要工具', '信息收集', 'Search', 'subfinder -d {domain} -o {output_file} --silent', '["{domain}", "{output_file}"]', 'active', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000018', 'Nmap 端口扫描器', '使用 Nmap 进行全面的端口扫描和服务识别，支持多种扫描技术和输出格式，可检测开放端口和运行服务', '网络扫描', 'Network', 'nmap -sS {target} -p {ports} -oX {output_file}', '["{target}", "{ports}", "{output_file}"]', 'active', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000019', 'Nuclei 漏洞扫描', '基于模板的快速漏洞扫描器，包含数千个漏洞检测模板，可自动化检测各种安全漏洞', '漏洞扫描', 'Bug', 'nuclei -u {target} -t {templates} -o {output_file} -silent', '["{target}", "{templates}", "{output_file}"]', 'active', NOW(), NOW()),
    ('00000000-0000-0000-0000-00000000001a', 'Gobuster 目录爆破', '高性能的目录和文件爆破工具，支持多线程和自定义字典，用于发现隐藏的Web资源', 'Web扫描', 'FileText', 'gobuster dir -u {target_url} -w {wordlist} -o {output_file} -q', '["{target_url}", "{wordlist}", "{output_file}"]', 'active', NOW(), NOW()),
    ('00000000-0000-0000-0000-00000000001b', 'Amass 资产发现', '强大的网络映射和资产发现工具，结合多种技术进行深度子域名枚举和网络侦察', '信息收集', 'Eye', 'amass enum -d {domain} -o {output_file} -config {config_file}', '["{domain}", "{output_file}", "{config_file}"]', 'active', NOW(), NOW()),
    ('00000000-0000-0000-0000-00000000001c', 'Masscan 快速端口扫描', '超高速端口扫描器，能够在几分钟内扫描整个互联网的端口，适合大规模网络发现', '网络扫描', 'Zap', 'masscan {target} -p {ports} --rate {rate} -oX {output_file}', '["{target}", "{ports}", "{rate}", "{output_file}"]', 'active', NOW(), NOW()),
    ('00000000-0000-0000-0000-00000000001d', 'Nikto Web扫描器', '专业的Web服务器扫描器，可检测Web服务器的安全问题、配置错误和潜在漏洞', 'Web扫描', 'Globe', 'nikto -h {target_url} -output {output_file} -Format xml', '["{target_url}", "{output_file}"]', 'active', NOW(), NOW()),
    ('00000000-0000-0000-0000-00000000001e', 'Dirsearch 目录扫描', '简单高效的Web路径扫描器，支持多种HTTP方法和响应分析，用于发现Web应用的隐藏目录', 'Web扫描', 'FolderOpen', 'dirsearch -u {target_url} -w {wordlist} -o {output_file} --format=json', '["{target_url}", "{wordlist}", "{output_file}"]', 'active', NOW(), NOW()),
    ('00000000-0000-0000-0000-00000000001f', 'SQLMap SQL注入检测', '自动化SQL注入检测和利用工具，支持多种数据库类型，可自动识别和利用SQL注入漏洞', '漏洞扫描', 'Database', 'sqlmap -u {target_url} --batch --output-dir={output_dir}', '["{target_url}", "{output_dir}"]', 'active', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000020', 'Hydra 暴力破解', '强大的网络登录破解器，支持多种协议的暴力破解攻击，可用于密码安全性测试', '漏洞扫描', 'Key', 'hydra -L {userlist} -P {passlist} {target} {service} -o {output_file}', '["{userlist}", "{passlist}", "{target}", "{service}", "{output_file}"]', 'inactive', NOW(), NOW());

-- Workflows
INSERT INTO workflows (id, name, description, category, status, workflow_data, created_by, created_at, updated_at)
VALUES
    ('00000000-0000-0000-0000-000000000021', '域名安全扫描工作流', '针对目标域名进行全面的安全扫描，包括子域名发现、端口扫描和漏洞检测', '网络扫描', 'active',
     '{"nodes": [{"id": "start-1", "type": "workflow-start", "position": {"x": 100, "y": 100}, "data": {"title": "开始", "desc": "工作流开始节点", "type": "workflow-start"}}, {"id": "subfinder-1", "type": "custom-tool", "position": {"x": 300, "y": 100}, "data": {"title": "子域名发现", "desc": "使用Subfinder发现子域名", "type": "custom-tool", "toolConfig": {"componentId": "00000000-0000-0000-0000-000000000017"}}}, {"id": "nmap-1", "type": "custom-tool", "position": {"x": 500, "y": 100}, "data": {"title": "端口扫描", "desc": "使用Nmap扫描开放端口", "type": "custom-tool", "toolConfig": {"componentId": "00000000-0000-0000-0000-000000000018"}}}, {"id": "end-1", "type": "workflow-end", "position": {"x": 700, "y": 100}, "data": {"title": "结束", "desc": "工作流结束节点", "type": "workflow-end"}}], "edges": [{"id": "e1", "source": "start-1", "target": "subfinder-1", "type": "security-edge"}, {"id": "e2", "source": "subfinder-1", "target": "nmap-1", "type": "security-edge"}, {"id": "e3", "source": "nmap-1", "target": "end-1", "type": "security-edge"}]}',
     'admin', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000022', 'Web应用安全检测', '专门针对Web应用进行安全检测，包括目录扫描、漏洞扫描和SQL注入检测', 'Web扫描', 'active',
     '{"nodes": [{"id": "start-2", "type": "workflow-start", "position": {"x": 100, "y": 100}, "data": {"title": "开始", "desc": "工作流开始节点", "type": "workflow-start"}}, {"id": "gobuster-1", "type": "custom-tool", "position": {"x": 300, "y": 100}, "data": {"title": "目录扫描", "desc": "使用Gobuster进行目录爆破", "type": "custom-tool", "toolConfig": {"componentId": "00000000-0000-0000-0000-00000000001a"}}}, {"id": "nuclei-1", "type": "custom-tool", "position": {"x": 500, "y": 100}, "data": {"title": "漏洞扫描", "desc": "使用Nuclei进行漏洞检测", "type": "custom-tool", "toolConfig": {"componentId": "00000000-0000-0000-0000-000000000019"}}}, {"id": "end-2", "type": "workflow-end", "position": {"x": 700, "y": 100}, "data": {"title": "结束", "desc": "工作流结束节点", "type": "workflow-end"}}], "edges": [{"id": "e1", "source": "start-2", "target": "gobuster-1", "type": "security-edge"}, {"id": "e2", "source": "gobuster-1", "target": "nuclei-1", "type": "security-edge"}, {"id": "e3", "source": "nuclei-1", "target": "end-2", "type": "security-edge"}]}',
     'admin', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000023', '综合安全评估', '全面的安全评估工作流，结合多种扫描工具进行深度安全检测', '安全评估', 'active',
     '{"nodes": [{"id": "start-3", "type": "workflow-start", "position": {"x": 100, "y": 100}, "data": {"title": "开始", "desc": "工作流开始节点", "type": "workflow-start"}}, {"id": "amass-1", "type": "custom-tool", "position": {"x": 300, "y": 50}, "data": {"title": "资产发现", "desc": "使用Amass进行资产发现", "type": "custom-tool", "toolConfig": {"componentId": "00000000-0000-0000-0000-00000000001b"}}}, {"id": "masscan-1", "type": "custom-tool", "position": {"x": 300, "y": 150}, "data": {"title": "快速端口扫描", "desc": "使用Masscan进行快速端口扫描", "type": "custom-tool", "toolConfig": {"componentId": "00000000-0000-0000-0000-00000000001c"}}}, {"id": "nikto-1", "type": "custom-tool", "position": {"x": 500, "y": 100}, "data": {"title": "Web扫描", "desc": "使用Nikto进行Web扫描", "type": "custom-tool", "toolConfig": {"componentId": "00000000-0000-0000-0000-00000000001d"}}}, {"id": "end-3", "type": "workflow-end", "position": {"x": 700, "y": 100}, "data": {"title": "结束", "desc": "工作流结束节点", "type": "workflow-end"}}], "edges": [{"id": "e1", "source": "start-3", "target": "amass-1", "type": "security-edge"}, {"id": "e2", "source": "start-3", "target": "masscan-1", "type": "security-edge"}, {"id": "e3", "source": "amass-1", "target": "nikto-1", "type": "security-edge"}, {"id": "e4", "source": "masscan-1", "target": "nikto-1", "type": "security-edge"}, {"id": "e5", "source": "nikto-1", "target": "end-3", "type": "security-edge"}]}',
     'admin', NOW(), NOW());

-- Workflow Executions
INSERT INTO workflow_executions (id, workflow_id, execution_name, status, input_parameters, result_summary, started_at, completed_at, created_at, updated_at)
VALUES
    ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000021', '域名扫描-example.com', 'completed',
     '{"target_domain": "example.com", "scan_ports": "1-1000"}',
     '发现3个子域名，检测到5个开放端口，未发现高危漏洞',
     NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000022', 'Web扫描-test.com', 'completed',
     '{"target_url": "https://test.com", "wordlist": "common.txt"}',
     '发现12个隐藏目录，检测到2个中危漏洞',
     NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000023', '综合评估-target.org', 'running',
     '{"target": "target.org", "deep_scan": true}',
     NULL,
     NOW() - INTERVAL '30 minutes', NULL, NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000021', '域名扫描-demo.net', 'failed',
     '{"target_domain": "demo.net", "scan_ports": "1-65535"}',
     NULL,
     NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours', NOW(), NOW());

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_main_domains_main_domain_name ON main_domains(main_domain_name);
CREATE INDEX IF NOT EXISTS idx_sub_domains_sub_domain_name ON sub_domains(sub_domain_name);
CREATE INDEX IF NOT EXISTS idx_sub_domains_main_domain_id ON sub_domains(main_domain_id);
CREATE INDEX IF NOT EXISTS idx_sub_domains_status ON sub_domains(status);
CREATE INDEX IF NOT EXISTS idx_organization_main_domains_org_id ON organization_main_domains(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_main_domains_domain_id ON organization_main_domains(main_domain_id);
CREATE INDEX IF NOT EXISTS idx_scan_tasks_org_id ON scan_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_scan_tasks_domain_id ON scan_tasks(main_domain_id);
CREATE INDEX IF NOT EXISTS idx_scan_tasks_status ON scan_tasks(status);
CREATE INDEX IF NOT EXISTS idx_scan_results_task_id ON scan_results(scan_task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_components_name ON workflow_components(name);
CREATE INDEX IF NOT EXISTS idx_workflow_components_category ON workflow_components(category);
CREATE INDEX IF NOT EXISTS idx_workflow_components_status ON workflow_components(status);
CREATE INDEX IF NOT EXISTS idx_workflow_components_placeholders ON workflow_components USING GIN(placeholders);

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_workflows_name ON workflows(name);
CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);
CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_workflows_workflow_data ON workflows USING GIN(workflow_data);

-- Workflow execution indexes
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON workflow_executions(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_completed_at ON workflow_executions(completed_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_input_parameters ON workflow_executions USING GIN(input_parameters);
