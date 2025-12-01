/**
 * Worker 节点相关类型定义
 */

// Worker 状态枚举 (与后端 serializer 对齐)
export type WorkerStatus = 'online' | 'offline' | 'pending'

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

