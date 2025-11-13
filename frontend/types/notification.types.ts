/**
 * 通知类型定义
 */

// 通知类型枚举
export type NotificationType = "vulnerability" | "scan" | "system"

// 严重等级
export type NotificationSeverity = "high" | "medium" | "low"

// 后端通知级别（与后端保持一致）
export type BackendNotificationLevel = "low" | "medium" | "high"

// 后端通知数据格式
export interface BackendNotification {
  id: number
  title: string
  message: string
  level: BackendNotificationLevel
  created_at: string
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
  notifications: Notification[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 标记已读请求
export interface MarkAsReadRequest {
  notificationIds: number[]
}

// 删除通知请求
export interface DeleteNotificationRequest {
  notificationIds: number[]
}
