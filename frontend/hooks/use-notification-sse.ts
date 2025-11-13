/**
 * SSE 实时通知 Hook
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { BackendNotification, Notification, BackendNotificationLevel, NotificationSeverity } from '@/types/notification.types'
import { buildBackendUrl } from '@/lib/env'

const severityMap: Record<BackendNotificationLevel, NotificationSeverity> = {
  important: 'important',
  warning: 'warning',
  info: 'info',
}

const inferNotificationType = (message: string) => {
  if (message?.includes('扫描') || message?.includes('任务')) {
    return 'scan' as const
  }
  if (message?.includes('漏洞')) {
    return 'vulnerability' as const
  }
  return 'system' as const
}

const formatTimeAgo = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  return date.toLocaleDateString()
}

export const transformBackendNotification = (backendNotification: BackendNotification): Notification => {
  const createdAtRaw = backendNotification.createdAt ?? backendNotification.created_at
  const createdDate = createdAtRaw ? new Date(createdAtRaw) : new Date()
  const isRead = backendNotification.isRead ?? backendNotification.is_read
  const notification: Notification = {
    id: backendNotification.id,
    type: inferNotificationType(backendNotification.message),
    title: backendNotification.title,
    description: backendNotification.message,
    time: formatTimeAgo(createdDate),
    unread: isRead === true ? false : true,
    severity: severityMap[backendNotification.level] ?? undefined,
    createdAt: createdDate.toISOString(),
  }
  return notification
}

export function useNotificationSSE() {
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)
  const queryClient = useQueryClient()

  const markNotificationsAsRead = useCallback((ids?: number[]) => {
    setNotifications(prev => prev.map(notification => {
      if (!ids || ids.includes(notification.id)) {
        return { ...notification, unread: false }
      }
      return notification
    }))
  }, [])

  // 连接 SSE
  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const sseUrl = buildBackendUrl('/api/notifications/sse/')
    const eventSource = new EventSource(sseUrl)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('✅ SSE 连接已建立，readyState:', eventSource.readyState)
      setIsConnected(true)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('📨 SSE 消息接收:', data)
        
        if (data.type === 'connected') {
          console.log('✅ SSE 连接成功')
          return
        }

        if (data.type === 'heartbeat') {
          // 心跳包仅用于保活连接
          console.log('💓 心跳包')
          setIsConnected(true)
          return
        }

        if (data.type === 'error') {
          console.error('❌ SSE 错误:', data.message)
          toast.error(`通知连接错误: ${data.message}`)
          return
        }

        // 处理通知消息
        if (data.type === 'notification') {
          console.log('🔔 处理通知消息 (type=notification)')
          // 移除 type 字段，获取实际的通知数据
          const { type, ...payload } = data as any
          
          if (payload.id && payload.title && payload.message) {
            console.log('✨ 转换通知:', payload)
            const notification = transformBackendNotification(payload as BackendNotification)
            console.log('📝 更新通知列表，新通知:', notification)
            setNotifications(prev => {
              const updated = [notification, ...prev.slice(0, 49)]
              console.log('📊 通知列表已更新，总数:', updated.length)
              return updated
            })

            queryClient.invalidateQueries({ queryKey: ['notifications'] })
          } else {
            console.warn('⚠️ 通知数据不完整:', payload)
          }
          return
        }

        // 备用处理：直接检查通知字段
        if (data.id && data.title && data.message) {
          console.log('🔔 处理通知消息 (直接字段)')
          const notification = transformBackendNotification(data as BackendNotification)
          
          // 添加到通知列表
          console.log('📝 更新通知列表，新通知:', notification)
          setNotifications(prev => {
            const updated = [notification, ...prev.slice(0, 49)]
            console.log('📊 通知列表已更新，总数:', updated.length)
            return updated
          })
          
          

          // 刷新通知查询
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      } catch (error) {
        console.error('❌ 解析 SSE 消息失败:', error, '原始数据:', event.data)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE 连接错误:', error)
      setIsConnected(false)
      
      // 5秒后重连
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          connect()
        }
      }, 5000)
    }
  }

  // 断开连接
  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsConnected(false)
  }

  // 清空通知
  const clearNotifications = () => {
    setNotifications([])
  }

  // 组件挂载时连接，卸载时断开
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [])

  return {
    isConnected,
    notifications,
    connect,
    disconnect,
    clearNotifications,
    markNotificationsAsRead,
  }
}
