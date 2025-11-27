/**
 * 定时扫描类型定义
 */

// 定时扫描状态
export type ScheduledScanStatus = "active" | "paused" | "expired"

// 定时扫描接口
export interface ScheduledScan {
  id: number
  name: string
  engine: number // 关联的扫描引擎ID
  engineName: string // 关联的扫描引擎名称
  targetIds: number[] // 目标 ID 列表
  targetDomains: string[] // 目标域名列表
  cronExpression: string // Cron 表达式
  isEnabled: boolean // 是否启用
  deploymentId?: string // Prefect Deployment ID
  nextRunTime?: string // 下次执行时间
  lastRunTime?: string // 上次执行时间
  runCount: number // 已执行次数
  createdAt: string
  updatedAt: string
}

// 创建定时扫描请求
export interface CreateScheduledScanRequest {
  name: string
  engine_id: number
  target_ids: number[]
  cron_expression: string // Cron 表达式，格式：分 时 日 月 周
  is_enabled?: boolean
}

// 更新定时扫描请求
export interface UpdateScheduledScanRequest {
  name?: string
  engine_id?: number
  target_ids?: number[]
  cron_expression?: string
  is_enabled?: boolean
}

// API 响应
export interface GetScheduledScansResponse {
  results: ScheduledScan[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
