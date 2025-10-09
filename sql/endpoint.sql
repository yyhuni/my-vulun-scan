-- 批量插入端点 Demo 数据 (PostgreSQL)
-- 依据后端模型：
--   表 endpoints(id, url NOT NULL, method, status_code, title, content_length, domain_id, subdomain_id, created_at, updated_at)
--   外键 domain_id 关联到 domains 表，subdomain_id 关联到 sub_domains 表
-- 组织表已在 organization.sql 中插入 ID 1..20
-- 域名表已在 domain.sql 中插入 ID 1..400 (20个组织 × 20个域名)
-- 子域名表已在 subdomain.sql 中插入 ID 1..4000 (400个域名 × 10个子域名)

-- 1) 插入主域名端点（每个域名 15 个 Endpoint）
INSERT INTO endpoints (id, url, method, status_code, title, content_length, domain_id, subdomain_id, created_at, updated_at) VALUES
-- Domain 1 (org1-example-01.com) 的 Endpoint
(1, 'https://org1-example-01.com/', 'GET', 200, 'Organization 1 Example 01 - Home Page', 15432, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'https://org1-example-01.com/api/v1/users', 'GET', 200, 'Users API Endpoint', 2048, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'https://org1-example-01.com/api/v1/login', 'POST', 200, 'Login API Endpoint', 512, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'https://org1-example-01.com/admin', 'GET', 403, 'Admin Panel', 1024, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'https://org1-example-01.com/dashboard', 'GET', 200, 'User Dashboard', 8192, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'https://org1-example-01.com/api/v1/products', 'GET', 200, 'Products API', 4096, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'https://org1-example-01.com/contact', 'GET', 200, 'Contact Us Page', 3072, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, 'https://org1-example-01.com/api/v1/orders', 'POST', 201, 'Create Order API', 1536, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(9, 'https://org1-example-01.com/search', 'GET', 200, 'Search Results', 6144, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(10, 'https://org1-example-01.com/api/v1/health', 'GET', 200, 'Health Check API', 256, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(11, 'https://org1-example-01.com/api/v1/upload', 'POST', 201, 'File Upload API', 1024, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(12, 'https://org1-example-01.com/sitemap.xml', 'GET', 200, 'XML Sitemap', 2048, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(13, 'https://org1-example-01.com/robots.txt', 'GET', 200, 'Robots File', 128, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(14, 'https://org1-example-01.com/api/v1/settings', 'PUT', 200, 'Update Settings API', 512, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(15, 'https://org1-example-01.com/api/v1/logout', 'POST', 200, 'Logout API', 256, 1, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Domain 2 (org1-example-02.com) 的 Endpoint
(16, 'https://org1-example-02.com/', 'GET', 200, 'Organization 1 Example 02 - Home Page', 16384, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(17, 'https://org1-example-02.com/api/v1/auth', 'POST', 200, 'Authentication API', 1024, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(18, 'https://org1-example-02.com/api/v1/profile', 'GET', 200, 'User Profile API', 2048, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(19, 'https://org1-example-02.com/docs', 'GET', 200, 'API Documentation', 12288, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(20, 'https://org1-example-02.com/blog', 'GET', 200, 'Blog Homepage', 8192, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(21, 'https://org1-example-02.com/api/v1/notifications', 'GET', 200, 'Notifications API', 3072, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(22, 'https://org1-example-02.com/support', 'GET', 200, 'Support Center', 4096, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(23, 'https://org1-example-02.com/api/v1/data', 'GET', 200, 'Data Export API', 8192, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(24, 'https://org1-example-02.com/pricing', 'GET', 200, 'Pricing Page', 6144, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(25, 'https://org1-example-02.com/api/v1/billing', 'POST', 200, 'Billing API', 1536, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(26, 'https://org1-example-02.com/features', 'GET', 200, 'Features Overview', 10240, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(27, 'https://org1-example-02.com/api/v1/webhooks', 'POST', 201, 'Webhook Handler', 512, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(28, 'https://org1-example-02.com/about', 'GET', 200, 'About Us Page', 4096, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(29, 'https://org1-example-02.com/api/v1/analytics', 'GET', 200, 'Analytics API', 4096, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(30, 'https://org1-example-02.com/terms', 'GET', 200, 'Terms of Service', 5120, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2) 插入子域名端点（每个子域名 5 个 Endpoint）
-- 为前10个子域名插入 Endpoint 示例
INSERT INTO endpoints (id, url, method, status_code, title, content_length, domain_id, subdomain_id, created_at, updated_at) VALUES
-- Subdomain 1 (www.org1-example-01.com) 的 Endpoint
(31, 'https://www.org1-example-01.com/', 'GET', 200, 'WWW Home Page', 18432, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(32, 'https://www.org1-example-01.com/api/v1/info', 'GET', 200, 'Site Information API', 2048, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(33, 'https://www.org1-example-01.com/news', 'GET', 200, 'News Section', 12288, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(34, 'https://www.org1-example-01.com/gallery', 'GET', 200, 'Image Gallery', 24576, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(35, 'https://www.org1-example-01.com/api/v1/search', 'GET', 200, 'Search API', 4096, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Subdomain 2 (api.org1-example-01.com) 的 Endpoint
(36, 'https://api.org1-example-01.com/v1/', 'GET', 200, 'API Root Endpoint', 1024, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(37, 'https://api.org1-example-01.com/v1/status', 'GET', 200, 'API Status Check', 512, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(38, 'https://api.org1-example-01.com/v1/docs', 'GET', 200, 'API Documentation', 16384, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(39, 'https://api.org1-example-01.com/v1/metrics', 'GET', 200, 'API Metrics', 8192, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(40, 'https://api.org1-example-01.com/v1/version', 'GET', 200, 'API Version Info', 256, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Subdomain 3 (admin.org1-example-01.com) 的 Endpoint
(41, 'https://admin.org1-example-01.com/', 'GET', 403, 'Admin Login Page', 4096, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(42, 'https://admin.org1-example-01.com/dashboard', 'GET', 200, 'Admin Dashboard', 16384, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(43, 'https://admin.org1-example-01.com/users', 'GET', 200, 'User Management', 12288, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(44, 'https://admin.org1-example-01.com/settings', 'GET', 200, 'System Settings', 8192, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(45, 'https://admin.org1-example-01.com/logs', 'GET', 200, 'System Logs', 20480, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Subdomain 4 (mail.org1-example-01.com) 的 Endpoint
(46, 'https://mail.org1-example-01.com/', 'GET', 200, 'Webmail Interface', 32768, 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(47, 'https://mail.org1-example-01.com/api/send', 'POST', 200, 'Send Email API', 1024, 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(48, 'https://mail.org1-example-01.com/inbox', 'GET', 200, 'Email Inbox', 16384, 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(49, 'https://mail.org1-example-01.com/compose', 'GET', 200, 'Compose Email', 8192, 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(50, 'https://mail.org1-example-01.com/contacts', 'GET', 200, 'Contact List', 4096, 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3) 使用 PostgreSQL 函数批量生成剩余数据
DO $$
DECLARE
    domain_id_var INTEGER;
    subdomain_id_var INTEGER;
    domain_name TEXT;
    subdomain_name TEXT;
    current_id INTEGER := 51;
    endpoint_paths TEXT[] := ARRAY[
        '/', '/api/v1/status', '/api/v1/data', '/dashboard', '/login', 
        '/logout', '/profile', '/settings', '/help', '/contact',
        '/api/v1/users', '/api/v1/auth', '/api/v1/upload', '/search', '/docs'
    ];
    methods TEXT[] := ARRAY['GET', 'POST', 'PUT', 'DELETE'];
    status_codes INTEGER[] := ARRAY[200, 201, 400, 401, 403, 404, 500];
    path TEXT;
    method TEXT;
    status_code INTEGER;
    title TEXT;
    content_length INTEGER;
    url TEXT;
BEGIN
    -- 为剩余域名生成 Endpoint (domain_id 3-400, 每个域名15个 Endpoint)
    FOR domain_id_var IN 3..400 LOOP
        SELECT name INTO domain_name FROM domains WHERE id = domain_id_var;
        
        FOR i IN 1..15 LOOP
            path := endpoint_paths[((i-1) % array_length(endpoint_paths, 1)) + 1];
            method := methods[((i-1) % array_length(methods, 1)) + 1];
            status_code := status_codes[((i-1) % array_length(status_codes, 1)) + 1];
            content_length := 1024 + (i * 512);
            url := 'https://' || domain_name || path;
            title := 'Endpoint ' || i || ' for ' || domain_name;
            
            INSERT INTO endpoints (id, url, method, status_code, title, content_length, domain_id, subdomain_id, created_at, updated_at)
            VALUES (current_id, url, method, status_code, title, content_length, domain_id_var, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
            
            current_id := current_id + 1;
        END LOOP;
    END LOOP;
    
    -- 为剩余子域名生成 Endpoint (subdomain_id 5-4000, 每个子域名5个 Endpoint)
    FOR subdomain_id_var IN 5..4000 LOOP
        SELECT sd.name, sd.domain_id, d.name INTO subdomain_name, domain_id_var, domain_name 
        FROM sub_domains sd 
        JOIN domains d ON sd.domain_id = d.id 
        WHERE sd.id = subdomain_id_var;
        
        FOR i IN 1..5 LOOP
            path := endpoint_paths[((i-1) % array_length(endpoint_paths, 1)) + 1];
            method := methods[((i-1) % array_length(methods, 1)) + 1];
            status_code := status_codes[((i-1) % array_length(status_codes, 1)) + 1];
            content_length := 512 + (i * 256);
            url := 'https://' || subdomain_name || '.' || domain_name || path;
            title := 'Subdomain Endpoint ' || i || ' for ' || subdomain_name || '.' || domain_name;
            
            INSERT INTO endpoints (id, url, method, status_code, title, content_length, domain_id, subdomain_id, created_at, updated_at)
            VALUES (current_id, url, method, status_code, title, content_length, domain_id_var, subdomain_id_var, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
            
            current_id := current_id + 1;
        END LOOP;
    END LOOP;
END $$;

-- 4) 重置序列，确保下次插入从正确的ID开始
-- 计算总 Endpoint 数：400个域名×15个 Endpoint + 4000个子域名×5个 Endpoint = 6000 + 20000 = 26000
SELECT setval('endpoints_id_seq', 26000, true);

-- 5) 验证插入结果
SELECT COUNT(*) as total_endpoints FROM endpoints;

-- 验证域名 Endpoint 数量
SELECT COUNT(*) as domain_endpoints FROM endpoints WHERE subdomain_id IS NULL;

-- 验证子域名 Endpoint 数量  
SELECT COUNT(*) as subdomain_endpoints FROM endpoints WHERE subdomain_id IS NOT NULL;

-- 验证每个域名的 Endpoint 数量（前10个域名）
SELECT domain_id, COUNT(*) as endpoint_count 
FROM endpoints 
WHERE domain_id <= 10 AND subdomain_id IS NULL
GROUP BY domain_id 
ORDER BY domain_id;

-- 验证每个子域名的 Endpoint 数量（前10个子域名）
SELECT subdomain_id, COUNT(*) as endpoint_count 
FROM endpoints 
WHERE subdomain_id <= 10
GROUP BY subdomain_id 
ORDER BY subdomain_id;

-- 查看前10个域名的 Endpoint
SELECT e.id, e.url, e.method, e.status_code, e.title, e.domain_id, d.name as domain_name
FROM endpoints e
JOIN domains d ON e.domain_id = d.id
WHERE e.domain_id <= 10 AND e.subdomain_id IS NULL
ORDER BY e.domain_id, e.id
LIMIT 20;

-- 查看前5个子域名的 Endpoint
SELECT e.id, e.url, e.method, e.status_code, e.title, e.subdomain_id, sd.name as subdomain_name
FROM endpoints e
JOIN sub_domains sd ON e.subdomain_id = sd.id
WHERE e.subdomain_id <= 5
ORDER BY e.subdomain_id, e.id;

-- 验证组织关联查询（测试按组织ID查询 Endpoint）
SELECT COUNT(*) as org1_endpoints
FROM endpoints e
JOIN domains d ON e.domain_id = d.id
JOIN organization_domains od ON d.id = od.domain_id
WHERE od.organization_id = 1;

-- 验证HTTP方法分布
SELECT method, COUNT(*) as count
FROM endpoints
GROUP BY method
ORDER BY count DESC;

-- 验证状态码分布
SELECT status_code, COUNT(*) as count
FROM endpoints
GROUP BY status_code
ORDER BY status_code;
