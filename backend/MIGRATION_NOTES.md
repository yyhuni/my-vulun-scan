# Celery 到 Prefect 迁移说明

## 迁移概述

已成功将后端的任务队列系统从 Celery 迁移到 Prefect。主要改动包括：

### 1. 核心变更

#### 依赖包
- ❌ 移除：`celery==5.4.0`, `flower==2.0.1`
- ✅ 添加：`prefect==2.14.21`, `prefect-sqlalchemy==0.4.1`
- ✅ 保留：`redis==5.0.3` (可选，用于缓存)

#### 配置文件
- ❌ 删除：`backend/config/celery.py`, `backend/config/flower_config.py`
- ✅ 新增：`backend/config/prefect.py`, `backend/prefect.yaml`
- ✅ 更新：`backend/config/settings.py` (Celery 配置改为 Prefect 配置)

### 2. 任务迁移

所有任务已从 Celery 装饰器迁移到 Prefect：

| 文件 | 原装饰器 | 新装饰器 | 状态 |
|------|---------|---------|------|
| `initiate_scan_task.py` | `@shared_task(bind=True)` | `@flow` | ✅ |
| `subdomain_discovery_task.py` | `@shared_task` | `@task` | ✅ |
| `finalize_scan_task.py` | `@shared_task(bind=True)` | `@task` | ✅ |
| `cleanup_old_scans_task.py` | `@shared_task(bind=True)` | `@flow` | ✅ |

### 3. 工作流编排

#### DAG Orchestrator
- ❌ 移除：Celery Canvas (`chain`, `group`)
- ✅ 使用：Prefect 原生 Flow 和 Task
- ✅ 保留：拓扑排序逻辑（Kahn 算法）
- ✅ 支持：任务并行执行和依赖管理

#### 核心文件
- `apps/scan/orchestrators/dag_orchestrator.py` - 完全重构
- `apps/scan/orchestrators/workflow_orchestrator.py` - 返回 Prefect Flow
- `apps/scan/services/scan_service.py` - 使用 `flow.apply_async()` 替代 `task.delay()`

### 4. 定时任务

#### Celery Beat → Prefect Deployments
- ❌ 移除：Celery Beat 调度器
- ✅ 新增：`backend/deployments/cleanup_deployment.py`
- ✅ 配置：每天凌晨 2:00 执行清理任务（亚洲/上海时区）

#### 部署方式
```bash
# 创建/更新部署
python deployments/cleanup_deployment.py

# 或使用 Prefect CLI
prefect deployment apply prefect.yaml
```

### 5. 服务启动

#### 启动脚本 (`script/start.sh`)
原服务：
- Django (8888)
- Celery Worker - orchestrator 队列
- Celery Worker - scans 队列
- Celery Beat
- Flower (5555)

新服务：
- Django (8888)
- Prefect Server (4200)
- Prefect Worker (默认工作池)

#### 停止脚本 (`script/stop.sh`)
已更新以停止 Prefect 相关进程

### 6. 数据库要求

Prefect 需要独立的 PostgreSQL 数据库：

```sql
CREATE DATABASE prefect;
```

配置示例：
```bash
export PREFECT_API_DATABASE_CONNECTION_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/prefect"
```

## 使用指南

### 启动服务

```bash
cd backend
bash script/start.sh
```

访问：
- Django API: http://localhost:8888
- API 文档: http://localhost:8888/swagger/
- **Prefect UI**: http://localhost:4200

### 停止服务

```bash
bash script/stop.sh
```

### 创建定时任务部署

```bash
cd backend
python deployments/cleanup_deployment.py
```

### 手动触发扫描

通过 Django API 正常调用即可，Prefect 会自动处理任务调度。

## 迁移注意事项

### 1. 信号处理器

Celery 的信号机制（`task_prerun`, `task_success`, `task_failure`）已移除。
状态管理现在由以下方式处理：
- 显式调用 Service 层方法
- Prefect 的内置状态管理
- Flow/Task 的 `on_failure` 和 `on_completion` 钩子（可选）

### 2. 任务结果

Celery 的 `result.id` 不再可用，Prefect 使用 Flow Run 的概念：
```python
flow_run = initiate_scan_flow.apply_async(kwargs={'scan_id': scan.id})
flow_run.name  # Flow Run 名称
```

### 3. 队列设计

Celery 的队列（`orchestrator`, `scans`）已被 Prefect 的工作池（Work Pools）替代：
- 默认工作池：`default`
- 并发限制：通过工作池配置

### 4. 重试机制

重试配置已迁移到 `@task` 装饰器参数：
```python
@task(
    retries=settings.PREFECT_TASK_DEFAULT_RETRIES,
    retry_delay_seconds=settings.PREFECT_TASK_DEFAULT_RETRY_DELAY_SECONDS,
    timeout_seconds=settings.PREFECT_TASK_DEFAULT_TIMEOUT_SECONDS,
)
```

### 5. 监控和日志

- ❌ Flower (Celery): http://localhost:5555
- ✅ Prefect UI: http://localhost:4200
  - 更强大的可视化界面
  - 实时任务状态追踪
  - Flow Run 历史记录
  - 任务依赖图可视化

## 测试清单

- [ ] Django API 启动成功
- [ ] Prefect Server 启动成功
- [ ] Prefect Worker 启动成功
- [ ] 创建扫描任务（单个目标）
- [ ] 创建扫描任务（组织批量）
- [ ] 查看 Prefect UI 中的 Flow Run
- [ ] 验证子域名发现任务执行
- [ ] 验证 finalize_scan 任务执行
- [ ] 验证定时清理任务部署
- [ ] 检查日志文件（`backend/var/logs/`）

## 回滚方案

如果迁移出现问题，可以回滚到 `main` 分支：

```bash
git checkout main
git branch -D feature/migrate-to-prefect
```

## 后续优化

1. **Docker 化**：更新 `docker/backend/docker-compose.yml` 包含 Prefect Server
2. **生产部署**：配置 Prefect Cloud（可选）或 Self-hosted Prefect Server
3. **并发优化**：根据实际负载调整工作池并发限制
4. **监控告警**：配置 Prefect 的通知和告警功能
5. **任务重试**：根据业务需求优化重试策略

## 相关资源

- Prefect 官方文档：https://docs.prefect.io/
- Prefect Cloud：https://www.prefect.io/cloud/
- Migration Guide：https://docs.prefect.io/latest/guides/migration-guide/

