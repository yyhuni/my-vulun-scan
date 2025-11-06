# 扫描结果定时清理功能使用指南

## 📋 概述

本项目已实现基于 Celery Beat 的扫描结果定时清理功能，每天凌晨自动清理过期的扫描结果目录。

## ✨ 功能特性

- ✅ **自动清理**：每天凌晨 2:00 自动执行
- ✅ **文件系统驱动**：直接扫描 SCAN_RESULTS_DIR 目录，不依赖数据库
- ✅ **时间戳判断**：根据目录的修改时间（mtime）判断是否过期
- ✅ **简单高效**：只需配置保留天数，自动清理超期目录
- ✅ **统计报告**：清理后提供详细统计信息（释放空间、清理数量等）
- ✅ **环境变量**：支持通过环境变量自定义配置

## 🚀 启动服务

### 1. 启动 Celery Worker（处理任务）

```bash
cd backend

# orchestrator 队列（处理清理任务）
celery -A config worker -Q orchestrator -c 5 -n orchestrator@%h --loglevel=info

# scans 队列（处理扫描任务，可选）
celery -A config worker -Q scans -c 2 -n scans@%h --loglevel=info
```

### 2. 启动 Celery Beat（定时调度）

```bash
cd backend

# 启动 Beat 调度器
celery -A config beat --loglevel=info
```

## ⚙️ 配置说明

### 默认配置

在 `backend/config/settings.py` 中：

```python
SCAN_RESULTS_RETENTION_DAYS = 7  # 所有扫描统一保留 7 天
```

### 环境变量配置（推荐）

在 `.env` 文件中添加：

```bash
# 扫描结果保留策略（单位：天）
SCAN_RETENTION_DAYS=14  # 所有扫描保留 14 天
```

### 定时任务配置

在 `backend/config/celery.py` 中：

```python
app.conf.beat_schedule = {
    'cleanup-old-scans-daily': {
        'task': 'cleanup_old_scans',
        'schedule': crontab(hour=2, minute=0),  # 每天凌晨 2:00
        'options': {
            'queue': 'orchestrator',
            'expires': 3600,
        },
    },
}
```

可以修改 `crontab()` 参数来调整执行时间：
- `crontab(hour=2, minute=0)` - 每天凌晨 2:00
- `crontab(hour=3, minute=30)` - 每天凌晨 3:30
- `crontab(hour=0, minute=0, day_of_week=0)` - 每周日凌晨 0:00

## 🧪 手动测试

### 立即执行清理任务

```python
from apps.scan.tasks.cleanup_old_scans_task import cleanup_old_scans_task

# 同步执行（测试）
result = cleanup_old_scans_task()
print(result)

# 异步执行（生产）
task = cleanup_old_scans_task.delay()
print(f"Task ID: {task.id}")
```

### 查看清理结果

```python
{
    'success': True,
    'scanned_count': 10,        # 扫描的目录数
    'cleaned_count': 8,         # 成功清理的目录数
    'failed_count': 1,          # 清理失败的目录数
    'skipped_count': 1,         # 跳过的目录数
    'freed_space_mb': 1234.56,  # 释放的磁盘空间（MB）
    'details': [...]            # 清理详情
}
```

## 🔍 清理逻辑说明

### 工作原理

1. **读取配置**：从环境变量读取 `SCAN_RESULTS_DIR` 和 `SCAN_RETENTION_DAYS`
2. **扫描目录**：遍历 `SCAN_RESULTS_DIR` 下的所有一级子目录
3. **判断时间**：检查每个目录的修改时间（mtime）
4. **执行清理**：删除超过保留期限的目录
5. **统计报告**：返回清理结果统计

### 时间判断逻辑

```python
# 获取目录修改时间
mtime = directory.stat().st_mtime

# 计算目录年龄（天）
age_days = (current_time - mtime) / (24 * 3600)

# 判断是否过期
if age_days > retention_days:
    # 删除目录
    remove_directory(directory)
```

### 目录结构示例

```
/data/scans/                    # SCAN_RESULTS_DIR
├── scan_20241201_123456/       # 5 天前 → 保留
├── scan_20241125_234512/       # 12 天前 → 删除
└── scan_20241120_112233/       # 17 天前 → 删除
```

## 📊 监控和日志

### 查看日志

```bash
# Worker 日志
tail -f logs/celery_worker.log

# Beat 日志
tail -f logs/celery_beat.log
```

### 日志示例

```
[2024-01-01 02:00:00] INFO - ============================================================
[2024-01-01 02:00:00] INFO - 开始定时清理扫描结果 - Task ID: abc123
[2024-01-01 02:00:00] INFO - ============================================================
[2024-01-01 02:00:00] INFO - 清理策略: {'SUCCESSFUL': 7, 'FAILED': 3, 'ABORTED': 1}
[2024-01-01 02:00:01] INFO - 找到 10 个需要清理的扫描结果
[2024-01-01 02:00:05] INFO - ✓ 清理成功 - Scan ID: 1, 状态: SUCCESSFUL, 空间: 123.45 MB
[2024-01-01 02:00:10] INFO - ============================================================
[2024-01-01 02:00:10] INFO - ✓ 清理完成 - 扫描: 10, 成功: 8, 失败: 2, 释放空间: 1234.56 MB
[2024-01-01 02:00:10] INFO - ============================================================
```

## 🔧 故障排查

### 1. Beat 未执行

**问题**：定时任务没有触发

**解决**：
- 确认 Celery Beat 进程正在运行：`ps aux | grep "celery.*beat"`
- 检查 Beat 日志：`tail -f logs/celery_beat.log`
- 验证配置：`celery -A config inspect scheduled`

### 2. 任务执行失败

**问题**：清理任务执行时报错

**解决**：
- 检查 Worker 日志：`tail -f logs/celery_worker.log`
- 确认数据库连接正常
- 检查目录权限（Worker 进程需要删除目录的权限）

### 3. 任务不追踪

**问题**：清理任务创建了无效的 ScanTask 记录

**解决**：
- 这是正常的，清理任务在维护任务白名单中
- 检查 `status_update_handler.py` 中的 `MAINTENANCE_TASKS`
- 确认日志中有 "维护任务，跳过追踪"

## 🎯 最佳实践

### 1. 生产环境部署

```bash
# 使用 systemd 管理服务
sudo systemctl start celery-worker
sudo systemctl start celery-beat
sudo systemctl enable celery-worker
sudo systemctl enable celery-beat
```

### 2. 监控告警

- 配置 Celery 监控工具（如 Flower）
- 设置磁盘空间告警（清理失败时）
- 记录清理统计到监控系统

### 3. 备份策略

在清理前备份重要扫描结果：
- 对于重要扫描，手动备份目录
- 考虑使用归档策略而不是直接删除
- 清理只删除目录，不涉及数据库

### 4. 环境变量配置

必需的环境变量：
```bash
# 扫描结果存储目录（必需）
SCAN_RESULTS_DIR=/data/scans

# 保留天数（可选，默认 7 天）
SCAN_RETENTION_DAYS=14
```

## 📝 相关文件

- **清理任务**：`backend/apps/scan/tasks/cleanup_old_scans_task.py`
- **Celery 配置**：`backend/config/celery.py`
- **设置配置**：`backend/config/settings.py`
- **信号处理器**：`backend/apps/scan/signals/status_update_handler.py`
- **工具函数**：`backend/apps/scan/utils/directory_cleanup.py`

## 🆘 技术支持

如有问题，请检查：
1. 日志文件（Worker 和 Beat）
2. 数据库连接状态
3. 磁盘空间和权限
4. Celery 版本兼容性

---

**注意**：清理操作不可逆，请确保配置合理的保留天数！

