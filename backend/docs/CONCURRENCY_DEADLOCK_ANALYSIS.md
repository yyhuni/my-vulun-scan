# 并发安全与死锁风险分析

## 问题场景

### 当前代码（save_ports_task.py）

```python
def _process_batch(batch, scan_id, target_id, batch_num):
    """处理单个批次"""
    with transaction.atomic():
        # Step 1: 查询 Subdomain
        subdomain_map = subdomain_repo.get_by_names(hosts, target_id)
        
        # Step 2: 创建 IPAddress
        ip_repo.bulk_create_ignore_conflicts(ip_items)
        
        # Step 3: 查询 IPAddress
        ip_map = ip_repo.get_by_subdomain_and_ips(...)
        
        # Step 4: 创建 Port
        port_repo.bulk_create_ignore_conflicts(port_items)
```

---

## 1. 什么是死锁？

### 基本概念

**死锁（Deadlock）**：两个或多个事务互相等待对方释放资源，导致所有事务都无法继续执行。

### 经典示例

```
时间线：
T1: 锁定资源A → 等待资源B
T2: 锁定资源B → 等待资源A
结果: 两个事务互相等待，永远无法完成（死锁）
```

---

## 2. 本项目的死锁风险场景

### 场景 A：多个扫描任务同时运行

**假设**：
- 扫描任务 1 正在处理 `example.com`（批次 1）
- 扫描任务 2 正在处理 `example.com`（批次 2）
- 两个批次包含部分**相同的域名和 IP**

**可能的死锁路径**：

```
时间线：T1（批次1）                      T2（批次2）
──────────────────────────────────────────────────────────
1. SELECT * FROM subdomain          SELECT * FROM subdomain
   WHERE name IN ('a.com', 'b.com')  WHERE name IN ('b.com', 'c.com')
   
2. INSERT INTO ip_address           INSERT INTO ip_address
   VALUES (subdomain_a, ip1)        VALUES (subdomain_b, ip2)
   [获取 ip_address 表的写锁]       [获取 ip_address 表的写锁]
   
3. SELECT * FROM ip_address         SELECT * FROM ip_address
   WHERE subdomain_id IN (...)      WHERE subdomain_id IN (...)
   [等待 T2 释放锁] ❌               [等待 T1 释放锁] ❌
   
结果: 死锁！PostgreSQL 检测到后会终止其中一个事务
```

### 场景 B：INSERT + ON CONFLICT 的锁竞争

**PostgreSQL `bulk_create(ignore_conflicts=True)` 的内部机制**：

```sql
INSERT INTO ip_address (subdomain_id, ip, target_id)
VALUES (1, '192.168.1.1', 100)
ON CONFLICT (subdomain_id, ip) DO NOTHING;
```

**锁定行为**：
1. PostgreSQL 尝试插入记录
2. 如果发现**唯一约束冲突**，会：
   - 锁定冲突的行（ROW LOCK）
   - 检查唯一约束
   - 跳过插入（DO NOTHING）
3. **关键问题**：即使 DO NOTHING，也会对冲突行加锁

**高并发下的锁竞争**：
```
T1: INSERT ip1 → 冲突 → 锁定已存在的行 → DO NOTHING
T2: INSERT ip1 → 等待 T1 释放锁 → 超时或死锁
```

---

## 3. 实际风险评估

### 当前项目的并发情况

查看 `port_scan_flow.py#L172-177`：

```python
# Step 4: 保存到数据库
save_result = save_ports_task(
    data_generator=data_generator,
    scan_id=scan_id,
    target_id=target_id,
    batch_size=500
)
```

**关键发现**：
- ✅ `save_ports_task` **不是并发调用的**（单个 Flow 内串行执行）
- ✅ 每个 Flow 只有一个 `save_ports_task` 实例
- ⚠️ 但是**多个扫描任务（不同 Flow）可能同时运行**

### 风险等级

| 场景 | 风险级别 | 说明 |
|-----|---------|------|
| **单个扫描任务** | 🟢 无风险 | 串行执行，无并发 |
| **多个扫描任务（不同目标）** | 🟢 低风险 | `target_id` 隔离，数据不重叠 |
| **多个扫描任务（同一目标）** | 🟡 中等风险 | 可能操作相同的 Subdomain/IP |
| **手动多次启动扫描** | 🟡 中等风险 | 用户行为导致的并发 |
| **定时任务重叠** | 🔴 高风险 | 如果定时任务设置不当，可能重叠 |

---

## 4. 具体的死锁触发条件

### 必须同时满足以下条件才会死锁：

1. ✅ **多个事务并发执行**
   - 多个扫描任务同时运行
   - 或者同一个扫描任务的多个批次（当前架构不会）

2. ✅ **操作相同的资源**
   - 相同的 `target_id`
   - 相同的域名/IP（数据重叠）

3. ✅ **不同的锁定顺序**
   - T1: 锁定 A → 锁定 B
   - T2: 锁定 B → 锁定 A

4. ✅ **使用事务**
   - `transaction.atomic()` 确保一致性，但也延长了锁的持有时间

---

## 5. 是否需要解决？

### 当前系统的设计

查看 `apps/scan/services/scan_service.py`（假设存在业务逻辑层）：
- 如果系统**允许同一目标的多个扫描任务并发执行** → **需要解决**
- 如果系统**限制同一目标只能有一个活跃扫描** → **无需解决**

### 判断依据

运行以下查询，检查是否可能出现并发：

```sql
-- 查询同一 target_id 的并发扫描任务
SELECT target_id, COUNT(*) as concurrent_scans
FROM scan
WHERE status IN ('running', 'initiated')
GROUP BY target_id
HAVING COUNT(*) > 1;
```

**如果查询结果为空** → 系统已有业务逻辑防止并发 → **无需额外处理**

---

## 6. 解决方案（如果需要）

### 方案 1：业务层加锁（推荐）⭐

在启动扫描任务前，检查目标是否有活跃扫描：

```python
# apps/scan/services/scan_service.py

def start_scan(self, target_id):
    # 检查是否有活跃扫描
    active_scan = Scan.objects.filter(
        target_id=target_id,
        status__in=['running', 'initiated']
    ).exists()
    
    if active_scan:
        raise ValidationError("该目标已有扫描任务正在运行，请等待完成后再启动新任务")
    
    # 创建新扫描任务
    scan = self.scan_repo.create(...)
    return scan
```

**优点**：
- ✅ 简单直接
- ✅ 避免资源浪费
- ✅ 用户体验更好（明确错误提示）

**缺点**：
- ❌ 不支持同一目标的并发扫描（但这可能是合理的限制）

---

### 方案 2：数据库行级锁

使用 `SELECT ... FOR UPDATE` 锁定关联记录：

```python
def _process_batch(batch, scan_id, target_id, batch_num):
    with transaction.atomic():
        # 锁定 Target 行，防止并发修改
        target = Target.objects.select_for_update().get(id=target_id)
        
        # 后续操作...
        subdomain_map = subdomain_repo.get_by_names(hosts, target_id)
        # ...
```

**优点**：
- ✅ 支持并发（但会串行化）
- ✅ 数据库级别保证

**缺点**：
- ❌ 性能下降（其他事务会等待）
- ❌ 可能造成锁超时

---

### 方案 3：优化事务粒度

减少事务的持有时间，降低锁冲突概率：

```python
def _process_batch(batch, scan_id, target_id, batch_num):
    # Step 1: 查询（不在事务中）
    subdomain_map = subdomain_repo.get_by_names(hosts, target_id)
    
    # 准备数据（不在事务中）
    ip_items = [...]
    
    # Step 2: 批量插入（短事务）
    with transaction.atomic():
        ip_repo.bulk_create_ignore_conflicts(ip_items)
    
    # Step 3: 查询（不在事务中）
    ip_map = ip_repo.get_by_subdomain_and_ips(...)
    
    # 准备数据（不在事务中）
    port_items = [...]
    
    # Step 4: 批量插入（短事务）
    with transaction.atomic():
        port_repo.bulk_create_ignore_conflicts(port_items)
```

**优点**：
- ✅ 减少锁持有时间
- ✅ 降低死锁概率
- ✅ 提高并发性能

**缺点**：
- ❌ 失去原子性（可能出现部分成功）
- ❌ 错误处理更复杂

---

### 方案 4：使用分布式锁（过度设计）

使用 Redis 实现分布式锁：

```python
import redis
from django_redis import get_redis_connection

def start_scan(self, target_id):
    redis_conn = get_redis_connection("default")
    lock_key = f"scan:target:{target_id}:lock"
    
    # 尝试获取锁（60秒超时）
    if not redis_conn.set(lock_key, "1", ex=60, nx=True):
        raise ValidationError("该目标正在扫描中")
    
    try:
        # 启动扫描任务
        scan = self.scan_repo.create(...)
        return scan
    finally:
        redis_conn.delete(lock_key)
```

**优点**：
- ✅ 支持分布式系统
- ✅ 可配置超时时间

**缺点**：
- ❌ 增加系统复杂度
- ❌ 依赖 Redis
- ❌ 当前单机系统不需要

---

## 7. 推荐方案

### 阶段一：业务层验证（立即实施）

```python
# apps/scan/services/scan_service.py

def create_scan(self, target_id, scan_type):
    """创建扫描任务，防止同一目标并发扫描"""
    
    # 检查是否有活跃扫描
    active_scan = Scan.objects.filter(
        target_id=target_id,
        status__in=[ScanStatus.RUNNING, ScanStatus.INITIATED]
    ).exists()
    
    if active_scan:
        raise ValidationError(
            f"目标 {target_id} 已有活跃扫描任务，请等待完成后再启动新任务"
        )
    
    # 创建扫描任务
    scan = self.scan_repo.create(...)
    return scan
```

### 阶段二：添加数据库约束（可选）

```python
# apps/scan/models.py

class Scan(models.Model):
    # ...
    
    class Meta:
        indexes = [
            # 查询活跃扫描的索引
            models.Index(fields=['target_id', 'status'])
        ]
```

### 阶段三：监控死锁（生产环境）

添加 PostgreSQL 死锁监控：

```sql
-- 查看死锁日志
SELECT * FROM pg_stat_database_conflicts;

-- 查看当前锁等待
SELECT * FROM pg_locks WHERE NOT granted;
```

---

## 8. 总结

### 当前系统的实际风险

| 维度 | 评估 |
|-----|------|
| **代码层面** | 🟡 存在理论风险（事务 + bulk_create） |
| **架构层面** | 🟢 单个 Flow 串行执行，风险可控 |
| **业务层面** | ❓ 取决于是否允许同一目标并发扫描 |
| **实际触发** | 🟢 需要特定条件（多个并发扫描 + 数据重叠） |

### 建议行动

1. **立即检查**：确认业务逻辑是否已限制同一目标的并发扫描
2. **如果未限制**：添加业务层验证（方案 1）
3. **如果已限制**：添加注释说明，无需额外处理
4. **生产环境**：监控数据库死锁日志

### 何时需要担心？

- ❌ **不需要担心**：单个扫描任务执行（当前架构）
- ❌ **不需要担心**：不同目标的并发扫描
- ✅ **需要关注**：允许同一目标的多个并发扫描
- ✅ **需要关注**：用户可能短时间内多次点击"启动扫描"按钮

---

## 9. 快速验证脚本

```bash
# 测试并发扫描是否会死锁
# 1. 启动扫描任务
curl -X POST http://localhost:8888/api/scans/ \
  -H "Content-Type: application/json" \
  -d '{"target_id": 1, "scan_type": "port_scan"}'

# 2. 立即再次启动（模拟并发）
curl -X POST http://localhost:8888/api/scans/ \
  -H "Content-Type: application/json" \
  -d '{"target_id": 1, "scan_type": "port_scan"}'

# 3. 检查日志
tail -f backend/logs/django.log | grep -i "deadlock\|IntegrityError"
```

---

## 附录：PostgreSQL 死锁日志示例

```
ERROR:  deadlock detected
DETAIL:  Process 12345 waits for ShareLock on transaction 67890; blocked by process 67891.
Process 67891 waits for ShareLock on transaction 12345; blocked by process 12345.
HINT:  See server log for query details.
CONTEXT:  while inserting index tuple (0,1) in relation "ip_address"
```

如果在日志中看到此类错误，说明确实发生了死锁，需要实施解决方案。
