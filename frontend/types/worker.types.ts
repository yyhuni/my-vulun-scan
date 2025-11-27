/**
 * Worker 节点相关类型定义
 */

// Worker 状态枚举
export type WorkerStatus = 'pending' | 'installing' | 'online' | 'offline' | 'error'

// Worker 节点
export interface WorkerNode {
  id: number
  name: string
  ipAddress: string
  sshPort: number
  username: string
  status: WorkerStatus
  createdAt: string
  updatedAt?: string
}

// 创建 Worker 请求
export interface CreateWorkerRequest {
  name: string
  ipAddress: string
  sshPort?: number
  username?: string
  password: string
}

// 更新 Worker 请求
export interface UpdateWorkerRequest {
  name?: string
  sshPort?: number
  username?: string
  password?: string
}

// Worker 列表响应
export interface WorkersResponse {
  results: WorkerNode[]
  total: number
  page: number
  pageSize: number
}

// 状态显示配置
export const WORKER_STATUS_CONFIG: Record<WorkerStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '等待部署', variant: 'secondary' },
  installing: { label: '正在安装', variant: 'default' },
  online: { label: '运行中', variant: 'default' },
  offline: { label: '离线', variant: 'outline' },
  error: { label: '错误', variant: 'destructive' },
}
