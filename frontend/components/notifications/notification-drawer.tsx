"use client"

import * as React from "react"
import { Bell, Trash2, AlertTriangle, Activity, Info, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useNotificationSSE } from "@/hooks/use-notification-sse"
import { useNotifications } from "@/hooks/use-notifications"
import type { Notification, NotificationType } from "@/types/notification.types"

/**
 * 通知抽屉组件
 * 从右侧滑出的侧边面板，显示详细的通知信息
 */
export function NotificationDrawer() {
  const [open, setOpen] = React.useState(false)

  // SSE 实时通知
  const { isConnected, notifications: sseNotifications } = useNotificationSSE()
  

  // 合并 SSE 和 API 通知，SSE 优先
  const allNotifications = React.useMemo(() => {
    const sseIds = new Set(sseNotifications.map(n => n.id))

    return [...sseNotifications]
  }, [sseNotifications])

  // 未读通知数量
  const unreadCount = allNotifications.filter(n => n.unread).length

  // 获取通知图标
  const getNotificationIcon = (type: NotificationType, severity?: string) => {
    if (type === "vulnerability") {
      return <AlertTriangle className={cn("h-5 w-5", 
        severity === "high" && "text-red-500",
        severity === "medium" && "text-orange-500",
        severity === "low" && "text-yellow-500"
      )} />
    }
    if (type === "scan") {
      return <Activity className="text-blue-500" />
    }
    return <Info className="text-gray-500" />
  }

  // 获取严重等级徽章
  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null
    
    const severityConfig = {
      high: { label: "高危", variant: "destructive" as const },
      medium: { label: "中危", variant: "default" as const },
      low: { label: "低危", variant: "secondary" as const },
    }
    
    const config = severityConfig[severity as keyof typeof severityConfig]
    if (!config) return null
    
    return <Badge variant={config.variant} className="ml-2">{config.label}</Badge>
  }

  // 渲染通知列表
  const renderNotificationList = (notificationList: Notification[]) => {
    if (notificationList.length === 0) {
      return (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          暂无通知
        </div>
      )
    }

    return (
      <div className="space-y-1.5">
        {notificationList.map((notification) => (
          <div
            key={notification.id}
            className="group relative rounded-md border p-3 transition-colors hover:bg-accent"
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">
                {getNotificationIcon(notification.type, notification.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none">
                      {notification.title}
                      {getSeverityBadge(notification.severity)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {notification.time}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        // TODO: 删除通知
                        console.log("删除:", notification.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {/* 连接状态指示器 */}
          <div className="absolute -bottom-1 -right-1">
            {isConnected ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" />
            )}
          </div>
          <span className="sr-only">通知</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[440px] p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-base">通知</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="p-4">
            {renderNotificationList(allNotifications)}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
