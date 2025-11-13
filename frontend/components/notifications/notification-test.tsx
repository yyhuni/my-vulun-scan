/**
 * 通知测试组件 - 用于测试 SSE 通知功能
 */

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useNotificationSSE } from "@/hooks/use-notification-sse"
import { buildBackendUrl } from "@/lib/env"
import type { BackendNotificationLevel } from "@/types/notification.types"

export function NotificationTest() {
  const { isConnected, notifications, connect, disconnect, clearNotifications } = useNotificationSSE()

  // 发送测试通知
  const sendTestNotification = async (level: BackendNotificationLevel) => {
    try {
      const response = await fetch(buildBackendUrl(`/api/notifications/test/?level=${level}`), {
        method: 'GET',
      })
      const result = await response.json()
      console.log('测试通知发送结果:', result)
    } catch (error) {
      console.error('发送测试通知失败:', error)
    }
  }

  const levelButtons: Array<{ level: BackendNotificationLevel; label: string; variant: "default" | "secondary" | "destructive" }> = [
    { level: 'info', label: '发送信息通知', variant: 'secondary' },
    { level: 'warning', label: '发送警告通知', variant: 'default' },
    { level: 'important', label: '发送重要通知', variant: 'destructive' },
  ]

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          SSE 通知测试
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "已连接" : "未连接"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 控制按钮 */}
        <div className="flex gap-2">
          <Button onClick={connect} disabled={isConnected}>
            连接 SSE
          </Button>
          <Button onClick={disconnect} disabled={!isConnected} variant="outline">
            断开连接
          </Button>
          {levelButtons.map(({ level, label, variant }) => (
            <Button key={level} onClick={() => sendTestNotification(level)} variant={variant}>
              {label}
            </Button>
          ))}
          <Button onClick={clearNotifications} variant="destructive">
            清空通知
          </Button>
        </div>

        {/* 通知列表 */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">
            实时通知 ({notifications.length})
          </h3>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无通知</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 border rounded-md bg-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {notification.type}
                      </Badge>
                      {notification.severity && (
                        <Badge 
                          variant={
                            notification.severity === 'important' ? 'destructive' :
                            notification.severity === 'warning' ? 'default' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {notification.severity}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {notification.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
