# 扫描结果清理功能 - 最终方案

## ✅ 已完成的工作

### 1. 清理策略优化

**之前的方案（已废弃）：**
- ❌ 查询数据库获取扫描记录
- ❌ 根据数据库状态和时间清理
- ❌ 依赖数据库记录的准确性
- ❌ 复杂的状态判断逻辑

**现在的方案（已实现）：**
- ✅ 直接扫描文件系统目录
- ✅ 根据目录修改时间（mtime）判断
- ✅ 不依赖数据库，更可靠
- ✅ 简单高效，易于维护

### 2. 核心特性

#### 基于文件系统的清理
```python
# 工作流程
1. 读取 SCAN_RESULTS_DIR 环境变量
2. 遍历该目录下的所有一级子目录
3. 获取每个目录的修改时间（mtime）
4. 计算目录年龄（天数）
5. 如果超过保留天数，删除目录
```

#### 简化的配置
```bash
# .env 文件
SCAN_RESULTS_DIR=/data/scans        # 扫描结果根目录
SCAN_RETENTION_DAYS=7               # 统一保留 7 天
```

#### 统一的保留策略
- 所有目录统一保留 N 天（默认 7 天）
- 不区分成功/失败/中止状态
- 简单直接，易于理解

## 🚀 使用方法

### 环境变量配置

必需配置：
```bash
SCAN_RESULTS_DIR=/data/scans
```

可选配置：
```bash
SCAN_RETENTION_DAYS=14  # 默认 7 天
```

### 启动服务

```bash
# 1. 启动 Worker
celery -A config worker -Q orchestrator -c 5 -n orchestrator@%h

# 2. 启动 Beat（定时调度）
celery -A config beat --loglevel=info
```

### 定时任务配置

在 `backend/config/celery.py` 中：

```python
app.conf.beat_schedule = {
    'cleanup-old-scans-daily': {
        'task': 'cleanup_old_scans',
        'schedule': crontab(hour=2, minute=0),  # 每天凌晨 2:00
    },
}
```

## 📊 清理效果示例

### 清理前
```
/data/scans/
├── scan_20241201_123456/  # 5 天前  (120 MB)
├── scan_20241125_234512/  # 12 天前 (450 MB)
└── scan_20241120_112233/  # 17 天前 (380 MB)
```

### 清理后（保留 7 天）
```
/data/scans/
└── scan_20241201_123456/  # 5 天前 (120 MB)

✓ 清理了 2 个目录
✓ 释放了 830 MB 空间
```

### 清理结果统计
```json
{
  "success": true,
  "scanned_count": 3,
  "cleaned_count": 2,
  "failed_count": 0,
  "skipped_count": 0,
  "freed_space_mb": 830.0,
  "details": [
    {
      "success": true,
      "name": "scan_20241125_234512",
      "age_days": 12,
      "freed_space_mb": 450.0
    },
    {
      "success": true,
      "name": "scan_20241120_112233",
      "age_days": 17,
      "freed_space_mb": 380.0
    }
  ]
}
```

## 💡 核心优势

### 1. 简单可靠
- ✅ 不依赖数据库，避免数据不一致问题
- ✅ 基于文件系统时间戳，客观准确
- ✅ 逻辑简单清晰，易于理解和维护

### 2. 高效灵活
- ✅ 直接扫描文件系统，性能高
- ✅ 只需一个配置参数，灵活调整
- ✅ 定时自动执行，无需人工干预

### 3. 安全可控
- ✅ 只删除超期目录，不影响数据库
- ✅ 详细的日志记录，方便审计
- ✅ 异常处理完善，不会影响系统

### 4. 易于扩展
- ✅ 支持自定义保留策略
- ✅ 可以轻松调整执行时间
- ✅ 可以添加更多清理逻辑

## 🔧 技术实现

### 核心代码逻辑

```python
# 1. 获取扫描结果根目录
scan_results_dir = os.getenv('SCAN_RESULTS_DIR')

# 2. 计算截止时间戳
retention_days = settings.SCAN_RESULTS_RETENTION_DAYS
cutoff_timestamp = time.time() - (retention_days * 24 * 3600)

# 3. 遍历目录
for item in Path(scan_results_dir).iterdir():
    if item.is_dir():
        mtime = item.stat().st_mtime
        if mtime < cutoff_timestamp:
            # 删除过期目录
            remove_directory(str(item))
```

### 文件结构

```
backend/
├── apps/scan/tasks/
│   └── cleanup_old_scans_task.py       # 清理任务（重写）
├── config/
│   ├── celery.py                        # Beat 配置
│   └── settings.py                      # 保留策略配置
└── CLEANUP_GUIDE.md                     # 使用指南
```

## 📝 相关文件

- **清理任务**：`backend/apps/scan/tasks/cleanup_old_scans_task.py`
- **Celery 配置**：`backend/config/celery.py`
- **设置配置**：`backend/config/settings.py`
- **信号处理器**：`backend/apps/scan/signals/status_update_handler.py`
- **使用指南**：`backend/CLEANUP_GUIDE.md`

## 🎯 最佳实践

1. **保留天数建议**：
   - 开发环境：3-7 天
   - 测试环境：7-14 天
   - 生产环境：14-30 天

2. **定时执行建议**：
   - 选择系统空闲时段（凌晨 2-4 点）
   - 避免与备份任务冲突
   - 监控清理任务执行情况

3. **监控告警建议**：
   - 磁盘空间使用率
   - 清理任务执行状态
   - 释放空间统计

## ⚠️ 注意事项

1. **环境变量必需**：
   - `SCAN_RESULTS_DIR` 必须正确配置
   - 目录必须存在且有读写权限

2. **清理不可逆**：
   - 删除的目录无法恢复
   - 建议定期备份重要扫描结果

3. **性能影响**：
   - 清理时会计算目录大小
   - 大量文件时可能耗时较长
   - 建议在空闲时段执行

---

**更新时间**：2024-12-07  
**版本**：v2.0（基于文件系统）

