"use client"

import * as React from "react"
import { Bell, AlertTriangle, Activity, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { transformBackendNotification, useNotificationSSE } from "@/hooks/use-notification-sse"
import { useMarkAllAsRead, useNotifications } from "@/hooks/use-notifications"
import type { Notification, NotificationType, NotificationSeverity } from "@/types/notification.types"

/**
 * 通知抽屉组件
 * 从右侧滑出的侧边面板，显示详细的通知信息
 */
export function NotificationDrawer() {
  const [open, setOpen] = React.useState(false)
  const queryParams = React.useMemo(() => ({ pageSize: 20 }), [])
  const { data: notificationResponse, isLoading: isHistoryLoading } = useNotifications(queryParams)

  // SSE 实时通知
  const { notifications: sseNotifications, markNotificationsAsRead } = useNotificationSSE()
  const { mutate: markAllAsRead } = useMarkAllAsRead()

  const [historyNotifications, setHistoryNotifications] = React.useState<Notification[]>([])

  React.useEffect(() => {
    if (!notificationResponse?.results) return
    const backendNotifications = notificationResponse.results ?? []
    setHistoryNotifications(backendNotifications.map(transformBackendNotification))
  }, [notificationResponse])

  // 合并 SSE 和 API 通知，SSE 优先
  const allNotifications = React.useMemo(() => {
    const seen = new Set<number>()
    const merged: Notification[] = []

    for (const notification of sseNotifications) {
      if (!seen.has(notification.id)) {
        merged.push(notification)
        seen.add(notification.id)
      }
    }

    for (const notification of historyNotifications) {
      if (!seen.has(notification.id)) {
        merged.push(notification)
        seen.add(notification.id)
      }
    }

    return merged.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })
  }, [historyNotifications, sseNotifications])

  // 未读通知数量
  const unreadCount = allNotifications.filter(n => n.unread).length

  React.useEffect(() => {
    if (open && unreadCount > 0) {
      markNotificationsAsRead()
      setHistoryNotifications(prev => prev.map(notification => ({ ...notification, unread: false })))
      markAllAsRead(undefined, {
        onError: () => {
          // 忽略错误，后续关闭/打开时会再次尝试
        },
      })
    }
  }, [open, unreadCount, markNotificationsAsRead, markAllAsRead])

  // 获取通知图标
  const severityIconClassMap: Record<NotificationSeverity, string> = {
    high: "text-red-500",
    medium: "text-amber-500",
    low: "text-gray-500",
  }

  const getNotificationIcon = (type: NotificationType, severity?: NotificationSeverity) => {
    const severityClass = severity ? severityIconClassMap[severity] : "text-gray-500"

    if (type === "vulnerability") {
      return <AlertTriangle className={cn("h-5 w-5", severityClass)} />
    }
    if (type === "scan") {
      return <Activity className={cn("h-5 w-5", severityClass)} />
    }
    return <Info className={cn("h-5 w-5", severityClass)} />
  }

  const severityCardClassMap: Record<NotificationSeverity, string> = {
    high: "border-red-300 bg-red-50 hover:bg-red-100 dark:border-red-500/60 dark:bg-red-500/10 dark:hover:bg-red-500/20",
    medium: "border-amber-300 bg-amber-50 hover:bg-amber-100 dark:border-amber-500/60 dark:bg-amber-500/10 dark:hover:bg-amber-500/20",
    low: "border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-500/60 dark:bg-gray-500/10 dark:hover:bg-gray-500/20",
  }

  const getNotificationCardClasses = (severity?: NotificationSeverity) => {
    if (!severity) {
      return "border-border bg-card hover:bg-accent/50"
    }
    return cn("border-border", severityCardClassMap[severity] ?? "")
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
            className={cn(
              "group relative rounded-md border p-3 transition-colors",
              getNotificationCardClasses(notification.severity)
            )}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">
                {getNotificationIcon(notification.type, notification.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug break-all">
                      {notification.title}
                    </p>
                    <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-all overflow-hidden">
                      {notification.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                    <span>{notification.time}</span>
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
          <span className="sr-only">通知</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[440px] p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-base">通知</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="p-4">
            {isHistoryLoading && allNotifications.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                通知加载中...
              </div>
            ) : (
              renderNotificationList(allNotifications)
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
