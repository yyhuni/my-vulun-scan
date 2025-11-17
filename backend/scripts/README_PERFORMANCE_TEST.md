# PostgreSQL 性能测试完整指南

## 📋 测试准备

### 1. 赋予脚本执行权限
```bash
cd ~/Desktop/scanner/backend/scripts
chmod +x monitor_pg_performance.sh
```

### 2. 配置 PostgreSQL 连接
确保可以无密码连接到远程数据库（使用 .pgpass 或环境变量）：

```bash
# 创建 .pgpass 文件（如果还没有）
cat > ~/.pgpass << EOF
your-vps-ip:5432:xingrin:postgres:your-password
EOF

chmod 600 ~/.pgpass

# 测试连接
psql -h your-vps-ip -U postgres -d xingrin -c "SELECT version();"
```

---

## 🎯 完整性能测试流程

### 阶段 1：测试前准备

#### 终端 1：记录测试前基准数据
```bash
cd ~/Desktop/scanner/backend

# 记录测试前的数据库状态
psql -h your-vps-ip -U postgres -d xingrin -f scripts/pg_stats_before_test.sql > logs/stats_before.txt

# 查看基准数据
cat logs/stats_before.txt
```

#### 终端 2：启动实时监控
```bash
cd ~/Desktop/scanner/backend/scripts

# 启动 PostgreSQL 实时监控（每 2 秒刷新）
./monitor_pg_performance.sh xingrin 2
```

**监控重点**：
- **连接数**：观察是否达到 max_connections 限制
- **活跃查询**：查看 INSERT 语句执行时间
- **表插入统计**：实时查看各表的插入速度
- **锁等待**：检查是否有锁冲突
- **缓存命中率**：应该 >90%，否则需要调整 shared_buffers
- **磁盘 IO**：blocks_read 过高说明缓存不足

---

### 阶段 2：执行性能测试

#### 终端 3：测试批次大小（5-10分钟）
```bash
cd ~/Desktop/scanner/backend
source ../.venv/bin/activate

# 测试最优批次大小
python manage.py generate_test_data --target xinye.com --count 10000 --test-batch-sizes
```

**观察终端 2 的监控**：
- 连接数是否稳定
- 是否有锁等待
- IO 是否正常

#### 终端 4：生成 10 万条数据（20-40分钟）
```bash
cd ~/Desktop/scanner/backend
source ../.venv/bin/activate

# 使用最优批次大小，开启性能监控
python manage.py generate_test_data \
  --target xinye.com \
  --count 100000 \
  --batch-size 5000 \
  --benchmark
```

---

### 阶段 3：测试后分析

#### 终端 1：记录测试后数据
```bash
cd ~/Desktop/scanner/backend

# 记录测试后的数据库状态
psql -h your-vps-ip -U postgres -d xingrin -f scripts/pg_stats_after_test.sql > logs/stats_after.txt

# 对比测试前后
diff logs/stats_before.txt logs/stats_after.txt
```

#### 分析重点

**1. 表大小增长**
```sql
-- 查看各表大小
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size('public.'||tablename) DESC;
```

**2. 索引效率**
```sql
-- 查看索引使用情况
SELECT 
    schemaname || '.' || tablename as table,
    indexname,
    idx_scan as scans,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

**3. 是否需要 VACUUM**
```sql
-- 检查死元组
SELECT 
    relname,
    n_live_tup,
    n_dead_tup,
    round(n_dead_tup * 100.0 / NULLIF(n_live_tup, 0), 2) as dead_ratio
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
  AND n_dead_tup > 0
ORDER BY dead_ratio DESC;

-- 如果 dead_ratio > 10%，执行 VACUUM
-- VACUUM ANALYZE public.subdomain;
```

---

## 📊 性能指标参考

### 远程数据库（VPS）

| 指标 | 正常范围 | 需优化 |
|------|---------|--------|
| **插入速度** | 500-1500 条/秒 | <300 条/秒 |
| **缓存命中率** | >90% | <80% |
| **活跃连接数** | <20 | >50 |
| **平均批次时间** | 2-8 秒 | >15 秒 |
| **锁等待** | 0 | >5 |
| **死元组比例** | <5% | >15% |

### 网络延迟影响

| 延迟 | 批次 1000 | 批次 5000 |
|------|-----------|-----------|
| <5ms | ~1200/s | ~1500/s |
| 10ms | ~800/s | ~1000/s |
| 50ms | ~300/s | ~500/s |
| >100ms | <200/s | <300/s |

---

## 🔧 常见问题优化

### 1. 插入速度慢 (<300条/秒)

**检查**：
```sql
-- 查看当前配置
SHOW shared_buffers;
SHOW work_mem;
SHOW maintenance_work_mem;
```

**优化**（需要 DBA 权限）：
```sql
-- postgresql.conf
shared_buffers = 256MB          # 增加共享缓存
work_mem = 16MB                 # 增加排序内存
maintenance_work_mem = 128MB    # 增加维护内存
max_connections = 100           # 减少最大连接数
checkpoint_completion_target = 0.9
```

### 2. 缓存命中率低 (<80%)

**原因**：shared_buffers 太小

**解决**：
```bash
# 增加 PostgreSQL 缓存（需重启）
# shared_buffers = 512MB  # 或更大
```

### 3. 锁等待多

**检查死锁**：
```sql
SELECT * FROM pg_locks WHERE NOT granted;
```

**解决**：
- 减小批次大小
- 增加并发连接数
- 检查是否有长事务

### 4. 磁盘 IO 高

**检查**：
```sql
SELECT 
    sum(heap_blks_read) as disk_reads,
    sum(heap_blks_hit) as cache_hits
FROM pg_statio_user_tables;
```

**解决**：
- 增加 shared_buffers
- 使用 SSD 硬盘
- 增加系统内存

---

## 📈 测试后清理（可选）

如果需要清理测试数据：

```sql
-- 删除测试数据
DELETE FROM subdomain WHERE name LIKE 'test-%';
DELETE FROM ip_address WHERE ip LIKE '%test%';
-- ... 其他表

-- 回收空间
VACUUM FULL;

-- 重建索引
REINDEX DATABASE xingrin;

-- 更新统计信息
ANALYZE;
```

---

## 💡 性能优化建议

### 基于测试结果：

1. **插入速度 >1000/秒**：当前配置良好，保持现状
2. **插入速度 500-1000/秒**：考虑调整批次大小或数据库配置
3. **插入速度 <500/秒**：需要优化网络或数据库配置

### 长期优化：

1. **启用连接池**：使用 pgBouncer 减少连接开销
2. **分区表**：数据量超过 1000 万时考虑分区
3. **定期维护**：每周执行 VACUUM ANALYZE
4. **监控告警**：使用 pg_stat_statements 追踪慢查询

---

## 🎯 最终决策

测试完成后，根据结果选择优化方案：

| 性能 | 方案 | 实施 |
|------|------|------|
| **优秀** (>1000/s) | 当前 prefetch + len() | ✅ 保持现状 |
| **良好** (500-1000/s) | 考虑缓存字段 | 数据量 >50万 时实施 |
| **一般** (300-500/s) | 缓存字段 + 读写分离 | 立即实施缓存 |
| **较差** (<300/s) | 全面优化 | 检查网络和数据库配置 |
