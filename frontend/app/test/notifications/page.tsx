"use client"

import { NotificationTest } from "@/components/notifications"

export default function NotificationsTestPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">通知系统测试</h1>
        <p className="text-muted-foreground">
          测试 SSE 实时通知功能，包括连接状态、消息接收和显示效果
        </p>
      </div>

      {/* 测试组件 */}
      <div className="flex justify-center">
        <NotificationTest />
      </div>
    </div>
  )
}
