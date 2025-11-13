/**
 * 通知类型定义
 */

// 通知类型枚举
export type NotificationType = "vulnerability" | "scan" | "system"

// 严重等级
export type NotificationSeverity = "low" | "medium" | "high"

// 后端通知级别（与后端保持一致）
export type BackendNotificationLevel = NotificationSeverity

// 后端通知数据格式
export interface BackendNotification {
  id: number
  title: string
  message: string
  level: BackendNotificationLevel
  created_at?: string
  createdAt?: string
  read_at?: string | null
  readAt?: string | null
  is_read?: boolean
  isRead?: boolean
}

// 通知接口
export interface Notification {
  id: number
  type: NotificationType
  title: string
  description: string
  detail?: string
  time: string
  unread: boolean
  severity?: NotificationSeverity
  createdAt?: string
}

// 获取通知列表请求参数
export interface GetNotificationsRequest {
  page?: number
  pageSize?: number
  type?: NotificationType
  unread?: boolean
}

// 获取通知列表响应
export interface GetNotificationsResponse {
  results: BackendNotification[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
