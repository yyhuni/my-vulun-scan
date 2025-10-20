/**
 * 通知相关的 React Query hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NotificationService } from '@/services/notification.service'
import type {
  GetNotificationsRequest,
  MarkAsReadRequest,
  DeleteNotificationRequest,
} from '@/types/notification.types'
import { toast } from 'sonner'

/**
 * 获取通知列表
 */
export function useNotifications(params?: GetNotificationsRequest) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => NotificationService.getNotifications(params),
  })
}

/**
 * 获取未读通知数量
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => NotificationService.getUnreadCount(),
    refetchInterval: 30000, // 每 30 秒自动刷新
  })
}

/**
 * 标记通知为已读
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: MarkAsReadRequest) => NotificationService.markAsRead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('已标记为已读')
    },
    onError: (error: any) => {
      console.error('标记已读失败:', error)
      toast.error('标记已读失败')
    },
  })
}

/**
 * 标记所有通知为已读
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => NotificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('已全部标记为已读')
    },
    onError: (error: any) => {
      console.error('标记全部已读失败:', error)
      toast.error('标记全部已读失败')
    },
  })
}

/**
 * 删除通知
 */
export function useDeleteNotifications() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: DeleteNotificationRequest) => NotificationService.deleteNotifications(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('已删除通知')
    },
    onError: (error: any) => {
      console.error('删除通知失败:', error)
      toast.error('删除通知失败')
    },
  })
}
