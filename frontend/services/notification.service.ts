/**
 * 通知服务
 * 处理所有与通知相关的 API 请求
 */

import api from '@/lib/api-client'
import type { ApiResponse } from '@/types/api-response.types'
import type {
  Notification,
  GetNotificationsRequest,
  GetNotificationsResponse,
  MarkAsReadRequest,
  DeleteNotificationRequest,
} from '@/types/notification.types'

export class NotificationService {
  /**
   * 获取通知列表
   */
  static async getNotifications(
    params: GetNotificationsRequest = {}
  ): Promise<ApiResponse<GetNotificationsResponse>> {
    const response = await api.get<ApiResponse<GetNotificationsResponse>>('/notifications/', {
      params,
    })
    return response.data
  }

  /**
   * 标记通知为已读
   */
  static async markAsRead(data: MarkAsReadRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/notifications/mark-as-read/', data)
    return response.data
  }

  /**
   * 标记所有通知为已读
   */
  static async markAllAsRead(): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/notifications/mark-all-as-read/')
    return response.data
  }

  /**
   * 删除通知
   */
  static async deleteNotifications(data: DeleteNotificationRequest): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>('/notifications/', {
      data,
    })
    return response.data
  }

  /**
   * 获取未读通知数量
   */
  static async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    const response = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count/')
    return response.data
  }
}
