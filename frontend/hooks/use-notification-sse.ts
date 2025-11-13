/**
 * SSE 实时通知 Hook
 */

import { useEffect, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { BackendNotification, Notification } from '@/types/notification.types'

export function useNotificationSSE() {
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)
  const queryClient = useQueryClient()

  // 转换后端通知格式到前端格式
  const transformNotification = (backendNotification: BackendNotification): Notification => {
    // 根据消息内容判断通知类型
    let type: 'scan' | 'vulnerability' | 'system' = 'system'
    if (backendNotification.message.includes('扫描') || backendNotification.message.includes('任务')) {
      type = 'scan'
    } else if (backendNotification.message.includes('漏洞')) {
      type = 'vulnerability'
    }

    // 格式化时间
    const timeAgo = formatTimeAgo(new Date(backendNotification.created_at))

    return {
      id: backendNotification.id,
      type,
      title: backendNotification.title,
      description: backendNotification.message,
      time: timeAgo,
      unread: true,
      severity: backendNotification.level === 'low' ? 'low' : 
                backendNotification.level === 'medium' ? 'medium' : 
                backendNotification.level === 'high' ? 'high' : undefined
    }
  }

  // 格式化时间为相对时间
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

  // 连接 SSE
  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource('/api/notifications/sse/')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('SSE 连接已建立')
      setIsConnected(true)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'connected') {
          console.log('SSE 连接成功')
          return
        }

        if (data.type === 'heartbeat') {
          // 心跳包仅用于保活连接
          setIsConnected(true)
          return
        }

        if (data.type === 'error') {
          console.error('SSE 错误:', data.message)
          toast.error(`通知连接错误: ${data.message}`)
          return
        }

        // 处理通知消息
        if (data.type === 'notification') {
          const payload = (data.data ?? data) as BackendNotification

          if (payload.id && payload.title && payload.message) {
            const notification = transformNotification(payload)
            setNotifications(prev => [notification, ...prev.slice(0, 49)])
            toast.info(notification.title, {
              description: notification.description,
            })
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
          }
          return
        }

        if (data.id && data.title && data.message) {
          const notification = transformNotification(data as BackendNotification)
          
          // 添加到通知列表
          setNotifications(prev => [notification, ...prev.slice(0, 49)]) // 最多保留50条
          
          // 显示 toast 通知
          toast.info(notification.title, {
            description: notification.description,
          })

          // 刷新通知查询
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      } catch (error) {
        console.error('解析 SSE 消息失败:', error)
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
    clearNotifications
  }
}
