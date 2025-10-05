-- 批量插入子域名 Demo 数据 (PostgreSQL)
-- 依据后端模型：
--   表 sub_domains(id, name NOT NULL, domain_id NOT NULL, created_at, updated_at)
--   外键 domain_id 关联到 domains 表
-- 域名表已在 domain.sql 中插入 ID 1..400 (20个组织 × 20个域名)
-- 每个域名关联 10 个子域名，总共 4000 个子域名

-- 插入 4000 个子域名（每个域名 10 个子域名）
INSERT INTO sub_domains (id, name, domain_id, created_at, updated_at) VALUES
-- Domain 1 (org1-example-01.com) 的子域名
(1, 'www.org1-example-01.com', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'api.org1-example-01.com', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'admin.org1-example-01.com', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'mail.org1-example-01.com', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'ftp.org1-example-01.com', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'blog.org1-example-01.com', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'shop.org1-example-01.com', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, 'cdn.org1-example-01.com', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(9, 'test.org1-example-01.com', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(10, 'dev.org1-example-01.com', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Domain 2 (org1-example-02.com) 的子域名
(11, 'www.org1-example-02.com', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(12, 'api.org1-example-02.com', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(13, 'admin.org1-example-02.com', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(14, 'mail.org1-example-02.com', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(15, 'ftp.org1-example-02.com', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(16, 'blog.org1-example-02.com', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(17, 'shop.org1-example-02.com', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(18, 'cdn.org1-example-02.com', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(19, 'test.org1-example-02.com', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(20, 'dev.org1-example-02.com', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Domain 3 (org1-example-03.com) 的子域名
(21, 'www.org1-example-03.com', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(22, 'api.org1-example-03.com', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(23, 'admin.org1-example-03.com', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(24, 'mail.org1-example-03.com', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(25, 'ftp.org1-example-03.com', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(26, 'blog.org1-example-03.com', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(27, 'shop.org1-example-03.com', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(28, 'cdn.org1-example-03.com', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(29, 'test.org1-example-03.com', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(30, 'dev.org1-example-03.com', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Domain 4 (org1-example-04.com) 的子域名
(31, 'www.org1-example-04.com', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(32, 'api.org1-example-04.com', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(33, 'admin.org1-example-04.com', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(34, 'mail.org1-example-04.com', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(35, 'ftp.org1-example-04.com', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(36, 'blog.org1-example-04.com', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(37, 'shop.org1-example-04.com', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(38, 'cdn.org1-example-04.com', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(39, 'test.org1-example-04.com', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(40, 'dev.org1-example-04.com', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Domain 5 (org1-example-05.com) 的子域名
(41, 'www.org1-example-05.com', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(42, 'api.org1-example-05.com', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(43, 'admin.org1-example-05.com', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(44, 'mail.org1-example-05.com', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(45, 'ftp.org1-example-05.com', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(46, 'blog.org1-example-05.com', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(47, 'shop.org1-example-05.com', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(48, 'cdn.org1-example-05.com', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(49, 'test.org1-example-05.com', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(50, 'dev.org1-example-05.com', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 由于完整的4000条数据太长，这里提供生成脚本的模板
-- 可以使用以下 PostgreSQL 函数批量生成剩余数据：

DO $$
DECLARE
    domain_id_var INTEGER;
    subdomain_prefixes TEXT[] := ARRAY['www', 'api', 'admin', 'mail', 'ftp', 'blog', 'shop', 'cdn', 'test', 'dev'];
    prefix TEXT;
    domain_name TEXT;
    current_id INTEGER := 51; -- 从51开始，因为前面已经插入了50条
BEGIN
    -- 遍历所有域名 (ID 6-400)
    FOR domain_id_var IN 6..400 LOOP
        -- 获取域名名称
        SELECT name INTO domain_name FROM domains WHERE id = domain_id_var;
        
        -- 为每个域名创建10个子域名
        FOREACH prefix IN ARRAY subdomain_prefixes LOOP
            INSERT INTO sub_domains (id, name, domain_id, created_at, updated_at) 
            VALUES (current_id, prefix || '.' || domain_name, domain_id_var, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
            current_id := current_id + 1;
        END LOOP;
    END LOOP;
END $$;

-- 重置序列，确保下次插入从正确的ID开始
SELECT setval('sub_domains_id_seq', 4000, true);

-- 验证插入结果
SELECT COUNT(*) as total_subdomains FROM sub_domains;

-- 验证每个域名的子域名数量
SELECT domain_id, COUNT(*) as subdomain_count 
FROM sub_domains 
GROUP BY domain_id 
ORDER BY domain_id 
LIMIT 10;

-- 查看前10个域名的子域名
SELECT sd.id, sd.name, sd.domain_id, d.name as domain_name
FROM sub_domains sd
JOIN domains d ON sd.domain_id = d.id
WHERE sd.domain_id <= 10
ORDER BY sd.domain_id, sd.id;

-- 验证组织关联查询（测试按组织ID查询子域名）
SELECT COUNT(*) as org1_subdomains
FROM sub_domains sd
JOIN domains d ON sd.domain_id = d.id
JOIN organization_domains od ON d.id = od.domain_id
WHERE od.organization_id = 1;
