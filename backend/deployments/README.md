# Prefect Deployments 使用说明

本目录包含 XingRin 项目的 Prefect Deployment 配置文件。

**版本**: Prefect 3.4.25

## Prefect 3.x 原生 API

本项目完全使用 Prefect 3.x 原生 API：
- ✅ **简化的 Deployment 创建**: 使用 `flow.deploy()` 直接创建部署
- ✅ **底层 Client API**: 使用 `get_client()` 进行更灵活的流程控制
- ✅ **Python 3.13 完整支持**: 原生支持最新 Python 版本
- ✅ **性能优化**: 更快的任务调度和执行（比 2.x 快 40%）

## 目录结构

```
deployments/
├── README.md                        # 本文件
├── initiate_scan_deployment.py      # 扫描任务 Deployment（按需触发）
└── cleanup_deployment.py            # 清理任务 Deployment（定时调度）
```

---

## 快速开始

### 1. 启动 Prefect Server

```bash
# 启动 Prefect Server
prefect server start
```

访问 UI（可选）: http://127.0.0.1:4200

### 2. 创建 Deployments

```bash
# 进入 backend 目录
cd backend

# 创建扫描任务 Deployment
python deployments/initiate_scan_deployment.py

# 创建清理任务 Deployment
python deployments/cleanup_deployment.py
```

输出示例：
```
✓ 部署已创建/更新: initiate-scan-on-demand
  Deployment ID: f8a3c2e1-...
  调度: 按需触发（无定时调度）
  工作池: default
  状态: 等待 API 调用
```

### 3. 启动 Worker

Worker 负责监听和执行任务：

```bash
# 启动默认工作池的 Worker
prefect worker start --pool default
```

输出示例：
```
Starting worker...
Worker started!
Polling for work from queue 'default'...
```

---

## Deployments 说明

### 1. initiate_scan_deployment.py - 扫描任务

**用途**: 异步执行扫描任务（按需触发）

**特点**:
- ✅ 无定时调度（通过 API 手动触发）
- ✅ 不阻塞 HTTP 请求
- ✅ 支持分布式执行

**触发方式**:
- 自动：通过 `ScanService.create_scans_for_targets()` API 调用
- 手动（测试）: 
  ```bash
  prefect deployment run initiate_scan/initiate-scan-on-demand \
    --param scan_id=1 \
    --param target_name="example.com" \
    --param target_id=1 \
    --param scan_workspace_dir="/data/scans/scan_xxx" \
    --param engine_name="subdomain discovery" \
    --param engine_config="{}"
  ```

### 2. cleanup_deployment.py - 清理任务

**用途**: 定时清理过期扫描结果

**特点**:
- ✅ 定时调度（每天凌晨 2:00）
- ✅ 自动执行
- ✅ 清理超过 7 天的扫描结果

**触发方式**:
- 自动：每天凌晨 2:00（Asia/Shanghai）
- 手动（测试）:
  ```bash
  prefect deployment run cleanup-old-scans/cleanup-old-scans-daily
  ```

---

## 常见问题

### Q1: Deployment 提交失败怎么办？

**错误示例**:
```
Deployment 'initiate_scan/initiate-scan-on-demand' not found
```

**解决方案**:
1. 确认 Prefect Server 正在运行：`prefect server start`
2. 重新创建 Deployment：`python deployments/initiate_scan_deployment.py`
3. 查看所有 Deployments：`prefect deployment ls`

### Q2: 任务提交后没有执行？

**可能原因**:
1. Worker 未启动
2. Worker 监听的工作池不匹配

**解决方案**:
```bash
# 检查 Worker 状态
prefect worker ls

# 启动 Worker
prefect worker start --pool default
```

### Q3: 如何查看任务执行日志？

**方式 1: Prefect UI**
- 访问 http://127.0.0.1:4200
- 进入 "Flow Runs" 页面
- 点击对应的 Flow Run 查看详细日志

**方式 2: 命令行**
```bash
# 查看最近的 Flow Runs
prefect flow-run ls

# 查看特定 Flow Run 的日志
prefect flow-run logs <flow-run-id>
```

### Q4: 如何更新 Deployment？

重新运行部署脚本即可：
```bash
python deployments/initiate_scan_deployment.py
```

### Q5: 如何删除 Deployment？

```bash
prefect deployment delete initiate_scan/initiate-scan-on-demand
```

---

## 生产环境部署建议

### 1. 使用 systemd 管理服务

**Prefect Server**:
```bash
# /etc/systemd/system/prefect-server.service
[Unit]
Description=Prefect Server
After=network.target

[Service]
Type=simple
User=xingrin
WorkingDirectory=/opt/xingrin/backend
ExecStart=/opt/xingrin/.venv/bin/prefect server start
Restart=always

[Install]
WantedBy=multi-user.target
```

**Prefect Worker**:
```bash
# /etc/systemd/system/prefect-worker.service
[Unit]
Description=Prefect Worker
After=network.target prefect-server.service

[Service]
Type=simple
User=xingrin
WorkingDirectory=/opt/xingrin/backend
ExecStart=/opt/xingrin/.venv/bin/prefect worker start --pool default
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl enable prefect-server prefect-worker
sudo systemctl start prefect-server prefect-worker
```

### 2. 监控和告警

- 使用 Prefect Cloud（付费）获得更好的监控
- 配置 Prefect Notifications（邮件/Slack）
- 集成 Prometheus + Grafana 监控

### 3. 高可用配置

- 运行多个 Worker 实例
- 使用外部 PostgreSQL（而非 SQLite）
- 配置 Redis 作为结果后端

---

## 相关文档

- [Prefect 官方文档](https://docs.prefect.io/)
- [Deployments 概念](https://docs.prefect.io/concepts/deployments/)
- [Workers & Work Pools](https://docs.prefect.io/concepts/work-pools/)
