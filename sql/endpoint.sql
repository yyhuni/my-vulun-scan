-- 批量插入端点 Demo 数据 (PostgreSQL)
-- 依据后端模型：
--   表 endpoints(id, url NOT NULL, method, status_code, title, content_length, domain_id, subdomain_id, created_at, updated_at)
--   外键 domain_id 关联到 domains 表，subdomain_id 关联到 sub_domains 表
-- 域名表已在 domain.sql 中插入 ID 1..400 (20个组织 × 20个域名)
-- 子域名表已在 subdomain.sql 中插入 ID 1..4000 (400个域名 × 10个子域名)
-- 每个域名关联 10 个端点，总共 4000 个端点

-- 插入 4000 个端点（每个域名 10 个端点）
INSERT INTO endpoints (id, url, method, status_code, title, content_length, domain_id, subdomain_id, created_at, updated_at) VALUES
-- Domain 1 (org1-example-01.com) 的端点
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

-- Domain 2 (org1-example-02.com) 的端点
(11, 'https://org1-example-02.com/', 'GET', 200, 'Organization 1 Example 02 - Home Page', 16384, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(12, 'https://org1-example-02.com/api/v1/auth', 'POST', 200, 'Authentication API', 1024, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(13, 'https://org1-example-02.com/api/v1/profile', 'GET', 200, 'User Profile API', 2048, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(14, 'https://org1-example-02.com/docs', 'GET', 200, 'API Documentation', 12288, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(15, 'https://org1-example-02.com/api/v1/settings', 'PUT', 200, 'Update Settings API', 512, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(16, 'https://org1-example-02.com/blog', 'GET', 200, 'Blog Homepage', 8192, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(17, 'https://org1-example-02.com/api/v1/notifications', 'GET', 200, 'Notifications API', 3072, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(18, 'https://org1-example-02.com/support', 'GET', 200, 'Support Center', 4096, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(19, 'https://org1-example-02.com/api/v1/upload', 'POST', 201, 'File Upload API', 1024, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(20, 'https://org1-example-02.com/sitemap.xml', 'GET', 200, 'XML Sitemap', 2048, 2, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Domain 3 (org1-example-03.com) 的端点
(21, 'https://org1-example-03.com/', 'GET', 200, 'Organization 1 Example 03 - Home Page', 14336, 3, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(22, 'https://org1-example-03.com/api/v1/data', 'GET', 200, 'Data Export API', 8192, 3, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(23, 'https://org1-example-03.com/api/v1/reports', 'GET', 200, 'Reports API', 16384, 3, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(24, 'https://org1-example-03.com/login', 'GET', 200, 'Login Page', 2048, 3, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(25, 'https://org1-example-03.com/api/v1/analytics', 'GET', 200, 'Analytics API', 4096, 3, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(26, 'https://org1-example-03.com/pricing', 'GET', 200, 'Pricing Page', 6144, 3, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(27, 'https://org1-example-03.com/api/v1/billing', 'POST', 200, 'Billing API', 1536, 3, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(28, 'https://org1-example-03.com/features', 'GET', 200, 'Features Overview', 10240, 3, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(29, 'https://org1-example-03.com/api/v1/webhooks', 'POST', 201, 'Webhook Handler', 512, 3, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(30, 'https://org1-example-03.com/robots.txt', 'GET', 200, 'Robots File', 128, 3, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Domain 4 (org1-example-04.com) 的端点
(31, 'https://org1-example-04.com/', 'GET', 200, 'Organization 1 Example 04 - Home Page', 18432, 4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(32, 'https://org1-example-04.com/api/v1/inventory', 'GET', 200, 'Inventory Management API', 12288, 4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(33, 'https://org1-example-04.com/api/v1/customers', 'GET', 200, 'Customer Management API', 8192, 4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(34, 'https://org1-example-04.com/checkout', 'GET', 200, 'Checkout Page', 6144, 4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(35, 'https://org1-example-04.com/api/v1/payments', 'POST', 200, 'Payment Processing API', 2048, 4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(36, 'https://org1-example-04.com/about', 'GET', 200, 'About Us Page', 4096, 4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(37, 'https://org1-example-04.com/api/v1/shipping', 'GET', 200, 'Shipping Options API', 3072, 4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(38, 'https://org1-example-04.com/faq', 'GET', 200, 'Frequently Asked Questions', 8192, 4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(39, 'https://org1-example-04.com/api/v1/reviews', 'POST', 201, 'Product Reviews API', 1024, 4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(40, 'https://org1-example-04.com/terms', 'GET', 200, 'Terms of Service', 5120, 4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Domain 5 (org1-example-05.com) 的端点
(41, 'https://org1-example-05.com/', 'GET', 200, 'Organization 1 Example 05 - Home Page', 20480, 5, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(42, 'https://org1-example-05.com/api/v1/projects', 'GET', 200, 'Project Management API', 16384, 5, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(43, 'https://org1-example-05.com/api/v1/tasks', 'GET', 200, 'Task Management API', 12288, 5, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(44, 'https://org1-example-05.com/workspace', 'GET', 200, 'Workspace Dashboard', 10240, 5, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(45, 'https://org1-example-05.com/api/v1/teams', 'GET', 200, 'Team Management API', 8192, 5, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(46, 'https://org1-example-05.com/calendar', 'GET', 200, 'Calendar View', 6144, 5, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(47, 'https://org1-example-05.com/api/v1/files', 'POST', 201, 'File Management API', 4096, 5, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(48, 'https://org1-example-05.com/reports', 'GET', 200, 'Project Reports', 14336, 5, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(49, 'https://org1-example-05.com/api/v1/time-tracking', 'POST', 200, 'Time Tracking API', 2048, 5, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(50, 'https://org1-example-05.com/help', 'GET', 200, 'Help Center', 7168, 5, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Domain 6 (org1-example-06.com) 的端点
(51, 'https://org1-example-06.com/', 'GET', 200, 'Organization 1 Example 06 - Home Page', 17408, 6, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(52, 'https://org1-example-06.com/api/v1/courses', 'GET', 200, 'Course Catalog API', 20480, 6, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(53, 'https://org1-example-06.com/api/v1/students', 'GET', 200, 'Student Management API', 12288, 6, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(54, 'https://org1-example-06.com/learn', 'GET', 200, 'Learning Platform', 16384, 6, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(55, 'https://org1-example-06.com/api/v1/progress', 'GET', 200, 'Learning Progress API', 4096, 6, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(56, 'https://org1-example-06.com/library', 'GET', 200, 'Resource Library', 24576, 6, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(57, 'https://org1-example-06.com/api/v1/assignments', 'POST', 201, 'Assignment Submission API', 8192, 6, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(58, 'https://org1-example-06.com/grades', 'GET', 200, 'Grade Book', 6144, 6, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(59, 'https://org1-example-06.com/api/v1/discussions', 'GET', 200, 'Discussion Forum API', 10240, 6, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(60, 'https://org1-example-06.com/certificates', 'GET', 200, 'Certificate Gallery', 8192, 6, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Domain 7 (org1-example-07.com) 的端点
(61, 'https://org1-example-07.com/', 'GET', 200, 'Organization 1 Example 07 - Home Page', 19456, 7, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(62, 'https://org1-example-07.com/api/v1/news', 'GET', 200, 'News Articles API', 16384, 7, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(63, 'https://org1-example-07.com/api/v1/categories', 'GET', 200, 'Content Categories API', 4096, 7, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(64, 'https://org1-example-07.com/subscribe', 'GET', 200, 'Newsletter Subscription', 3072, 7, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(65, 'https://org1-example-07.com/api/v1/comments', 'POST', 201, 'Comments API', 2048, 7, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(66, 'https://org1-example-07.com/archive', 'GET', 200, 'News Archive', 12288, 7, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(67, 'https://org1-example-07.com/api/v1/tags', 'GET', 200, 'Content Tags API', 1536, 7, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(68, 'https://org1-example-07.com/weather', 'GET', 200, 'Weather Widget', 2048, 7, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(69, 'https://org1-example-07.com/api/v1/rss', 'GET', 200, 'RSS Feed API', 4096, 7, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(70, 'https://org1-example-07.com/contact-editor', 'GET', 200, 'Contact Editor Form', 5120, 7, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Domain 8 (org1-example-08.com) 的端点
(71, 'https://org1-example-08.com/', 'GET', 200, 'Organization 1 Example 08 - Home Page', 21504, 8, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(72, 'https://org1-example-08.com/api/v1/properties', 'GET', 200, 'Real Estate Properties API', 24576, 8, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(73, 'https://org1-example-08.com/api/v1/agents', 'GET', 200, 'Real Estate Agents API', 8192, 8, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(74, 'https://org1-example-08.com/search-properties', 'GET', 200, 'Property Search Page', 16384, 8, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(75, 'https://org1-example-08.com/api/v1/listings', 'POST', 201, 'Property Listings API', 12288, 8, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(76, 'https://org1-example-08.com/mortgage-calculator', 'GET', 200, 'Mortgage Calculator', 6144, 8, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(77, 'https://org1-example-08.com/api/v1/inquiries', 'POST', 201, 'Property Inquiries API', 3072, 8, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(78, 'https://org1-example-08.com/neighborhoods', 'GET', 200, 'Neighborhood Guide', 18432, 8, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(79, 'https://org1-example-08.com/api/v1/favorites', 'POST', 201, 'Favorite Properties API', 2048, 8, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(80, 'https://org1-example-08.com/market-trends', 'GET', 200, 'Market Trends Analysis', 14336, 8, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Domain 9 (org1-example-09.com) 的端点
(81, 'https://org1-example-09.com/', 'GET', 200, 'Organization 1 Example 09 - Home Page', 22528, 9, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(82, 'https://org1-example-09.com/api/v1/recipes', 'GET', 200, 'Recipe Database API', 20480, 9, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(83, 'https://org1-example-09.com/api/v1/ingredients', 'GET', 200, 'Ingredients API', 8192, 9, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(84, 'https://org1-example-09.com/meal-planner', 'GET', 200, 'Meal Planning Tool', 12288, 9, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(85, 'https://org1-example-09.com/api/v1/nutrition', 'GET', 200, 'Nutrition Information API', 6144, 9, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(86, 'https://org1-example-09.com/cookbook', 'GET', 200, 'Digital Cookbook', 16384, 9, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(87, 'https://org1-example-09.com/api/v1/reviews', 'POST', 201, 'Recipe Reviews API', 4096, 9, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(88, 'https://org1-example-09.com/shopping-list', 'GET', 200, 'Shopping List Generator', 8192, 9, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(89, 'https://org1-example-09.com/api/v1/dietary', 'GET', 200, 'Dietary Restrictions API', 3072, 9, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(90, 'https://org1-example-09.com/chef-tips', 'GET', 200, 'Chef Tips & Tricks', 10240, 9, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Domain 10 (org1-example-10.com) 的端点
(91, 'https://org1-example-10.com/', 'GET', 200, 'Organization 1 Example 10 - Home Page', 23552, 10, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(92, 'https://org1-example-10.com/api/v1/workouts', 'GET', 200, 'Workout Programs API', 18432, 10, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(93, 'https://org1-example-10.com/api/v1/exercises', 'GET', 200, 'Exercise Database API', 16384, 10, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(94, 'https://org1-example-10.com/fitness-tracker', 'GET', 200, 'Fitness Progress Tracker', 14336, 10, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(95, 'https://org1-example-10.com/api/v1/goals', 'POST', 201, 'Fitness Goals API', 4096, 10, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(96, 'https://org1-example-10.com/nutrition-guide', 'GET', 200, 'Nutrition Guidelines', 12288, 10, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(97, 'https://org1-example-10.com/api/v1/progress', 'GET', 200, 'Progress Tracking API', 8192, 10, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(98, 'https://org1-example-10.com/community', 'GET', 200, 'Fitness Community Forum', 20480, 10, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(99, 'https://org1-example-10.com/api/v1/challenges', 'GET', 200, 'Fitness Challenges API', 6144, 10, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(100, 'https://org1-example-10.com/personal-trainer', 'GET', 200, 'Personal Trainer Booking', 10240, 10, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
