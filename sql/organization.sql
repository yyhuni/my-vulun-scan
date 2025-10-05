-- 批量插入 20 个组织 Demo 数据 (PostgreSQL)
-- 显式指定 ID 以确保与关联表匹配
INSERT INTO organizations (id, name, description, created_at, updated_at) VALUES
(1, '阿里巴巴集团', '中国领先的电子商务和云计算公司', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, '腾讯科技', '中国最大的互联网综合服务提供商', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, '字节跳动', '全球领先的内容平台公司，旗下有抖音、今日头条等产品', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, '百度公司', '中国领先的人工智能和互联网搜索公司', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, '京东集团', '中国领先的电商和零售基础设施服务商', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, '美团科技', '中国领先的生活服务电子商务平台', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, '拼多多', '中国新电商平台，专注于C2M拼团购物', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, '网易公司', '中国领先的互联网技术公司，专注游戏、邮箱等业务', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(9, '小米科技', '以手机、智能硬件和IoT平台为核心的互联网公司', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(10, '华为技术', '全球领先的ICT基础设施和智能终端提供商', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(11, '滴滴出行', '中国领先的移动出行平台', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(12, '快手科技', '中国领先的短视频和直播平台', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(13, 'B站', '中国年轻世代高度聚集的文化社区和视频平台', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(14, '携程旅行', '中国领先的在线旅游服务公司', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(15, '新浪微博', '中国领先的社交媒体平台', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(16, '知乎', '中国最大的问答社区和创作者聚集的原创内容平台', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(17, '爱奇艺', '中国领先的在线视频娱乐服务提供商', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(18, '360安全', '中国领先的互联网安全公司', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(19, '搜狗科技', '中国领先的搜索和输入法服务提供商', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(20, '陈陈科技', '中国领先的移动社交网络平台', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 重置序列，确保下次插入从 21 开始
SELECT setval('organizations_id_seq', 20, true);

-- 验证插入结果
SELECT COUNT(*) as total_count FROM organizations;

-- 查看最新插入的数据
SELECT id, name, description, created_at FROM organizations ORDER BY id DESC LIMIT 20;