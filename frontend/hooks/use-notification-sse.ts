/**
 * WebSocket 实时通知 Hook
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { BackendNotification, Notification, BackendNotificationLevel, NotificationSeverity } from '@/types/notification.types'
import { getBackendBaseUrl } from '@/lib/env'

const severityMap: Record<BackendNotificationLevel, NotificationSeverity> = {
  high: 'high',
  medium: 'medium',
  low: 'low',
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
  const wsRef = useRef<WebSocket | null>(null)
  const queryClient = useQueryClient()
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null)

  const markNotificationsAsRead = useCallback((ids?: number[]) => {
    setNotifications(prev => prev.map(notification => {
      if (!ids || ids.includes(notification.id)) {
        return { ...notification, unread: false }
      }
      return notification
    }))
  }, [])

  // 启动心跳
  const startHeartbeat = useCallback(() => {
    // 清除旧的心跳定时器
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
    }

    // 每 30 秒发送一次心跳
    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('[HEARTBEAT] 发送心跳 ping')
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // 30秒
  }, [])

  // 停止心跳
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
  }, [])

  // 连接 WebSocket
  const connect = useCallback(() => {
    // 关闭旧连接
    if (wsRef.current) {
      wsRef.current.close()
    }

    // 清除重连定时器
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
    }

    try {
      // 构造 WebSocket URL
      const backendUrl = getBackendBaseUrl()
      const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws'
      const wsHost = backendUrl.replace(/^https?:\/\//, '')
      const wsUrl = `${wsProtocol}://${wsHost}/ws/notifications/`

      console.log('[CONNECTING] 正在连接 WebSocket:', wsUrl)

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[SUCCESS] WebSocket 连接已建立')
        setIsConnected(true)
        // 启动心跳
        startHeartbeat()
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[MESSAGE] WebSocket 消息接收:', data)

          if (data.type === 'connected') {
            console.log('[SUCCESS] WebSocket 连接成功')
            return
          }

          if (data.type === 'pong') {
            // 心跳响应
            console.log('[HEARTBEAT] 心跳响应')
            return
          }

          if (data.type === 'error') {
            console.error('[ERROR] WebSocket 错误:', data.message)
            toast.error(`通知连接错误: ${data.message}`)
            return
          }

          // 处理通知消息
          if (data.type === 'notification') {
            console.log('[NOTIFICATION] 处理通知消息 (type=notification)')
            // 移除 type 字段，获取实际的通知数据
            const { type, ...payload } = data as any

            if (payload.id && payload.title && payload.message) {
              console.log('[TRANSFORM] 转换通知:', payload)
              const notification = transformBackendNotification(payload as BackendNotification)
              console.log('[UPDATE] 更新通知列表，新通知:', notification)
              setNotifications(prev => {
                const updated = [notification, ...prev.slice(0, 49)]
                console.log('[STATS] 通知列表已更新，总数:', updated.length)
                return updated
              })

              queryClient.invalidateQueries({ queryKey: ['notifications'] })
            } else {
              console.warn('[WARN] 通知数据不完整:', payload)
            }
            return
          }

          // 备用处理：直接检查通知字段
          if (data.id && data.title && data.message) {
            console.log('[NOTIFICATION] 处理通知消息 (直接字段)')
            const notification = transformBackendNotification(data as BackendNotification)

            // 添加到通知列表
            console.log('[UPDATE] 更新通知列表，新通知:', notification)
            setNotifications(prev => {
              const updated = [notification, ...prev.slice(0, 49)]
              console.log('[STATS] 通知列表已更新，总数:', updated.length)
              return updated
            })

            // 刷新通知查询
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
          }
        } catch (error) {
          console.error('[ERROR] 解析 WebSocket 消息失败:', error, '原始数据:', event.data)
        }
      }

      ws.onerror = (error) => {
        console.error('[ERROR] WebSocket 连接错误:', error)
        setIsConnected(false)
      }

      ws.onclose = (event) => {
        console.log('[CLOSED] WebSocket 连接已关闭:', event.code, event.reason)
        setIsConnected(false)
        // 停止心跳
        stopHeartbeat()

        // 5秒后重连
        if (event.code !== 1000) { // 1000 = 正常关闭
          console.log('[RECONNECT] 5秒后尝试重连...')
          reconnectTimerRef.current = setTimeout(() => {
            connect()
          }, 5000)
        }
      }
    } catch (error) {
      console.error('[ERROR] 创建 WebSocket 失败:', error)
      setIsConnected(false)
    }
  }, [queryClient, startHeartbeat, stopHeartbeat])

  // 断开连接
  const disconnect = useCallback(() => {
    // 停止心跳
    stopHeartbeat()

    // 清除重连定时器
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect') // 1000 = 正常关闭
      wsRef.current = null
    }
    setIsConnected(false)
  }, [stopHeartbeat])

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
  }, [connect, disconnect])

  return {
    isConnected,
    notifications,
    connect,
    disconnect,
    clearNotifications,
    markNotificationsAsRead,
  }
}
