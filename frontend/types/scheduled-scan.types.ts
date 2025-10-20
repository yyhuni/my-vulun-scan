/**
 * 定时扫描类型定义
 */

// 执行频率类型
export type ScheduleFrequency =
  | "once" // 仅一次
  | "daily" // 每天
  | "weekly" // 每周
  | "monthly" // 每月
  | "custom" // 自定义（Cron 表达式）

// 定时扫描状态
export type ScheduledScanStatus = "active" | "paused" | "expired"

// 定时扫描接口
export interface ScheduledScan {
  id: number
  name: string
  description?: string
  strategy_id: number // 关联的扫描策略ID
  strategy_name: string // 关联的扫描策略名称
  frequency: ScheduleFrequency // 执行频率
  cron_expression?: string // Cron 表达式（自定义频率时使用）
  target_domains: string[] // 目标域名列表
  is_enabled: boolean // 是否启用
  next_run_time?: string // 下次执行时间
  last_run_time?: string // 上次执行时间
  run_count: number // 已执行次数
  created_at: string
  updated_at: string
  created_by?: string // 创建人
}

// 创建定时扫描请求
export interface CreateScheduledScanRequest {
  name: string
  description?: string
  strategy_id: number
  frequency: ScheduleFrequency
  cron_expression?: string
  target_domains: string[]
  is_enabled?: boolean
}

// 更新定时扫描请求
export interface UpdateScheduledScanRequest {
  name?: string
  description?: string
  strategy_id?: number
  frequency?: ScheduleFrequency
  cron_expression?: string
  target_domains?: string[]
  is_enabled?: boolean
}

// API 响应
export interface GetScheduledScansResponse {
  scheduled_scans: ScheduledScan[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
