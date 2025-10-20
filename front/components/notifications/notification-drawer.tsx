"use client"

import * as React from "react"
import { Bell, Trash2, AlertTriangle, Activity, Info } from "lucide-react"
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
import type { Notification, NotificationType } from "@/types/notification.types"

/**
 * 通知抽屉组件
 * 从右侧滑出的侧边面板，显示详细的通知信息
 */
export function NotificationDrawer() {
  const [open, setOpen] = React.useState(false)

  // TODO: 从 API 获取实际的通知数据
  const notifications: Notification[] = [
    {
      id: 1,
      type: "vulnerability",
      title: "发现高危漏洞",
      description: "在 example.com 上发现 SQL 注入漏洞",
      detail: "检测到未过滤的用户输入直接拼接到 SQL 查询中，可能导致数据库信息泄露。建议立即修复。",
      time: "5 分钟前",
      unread: true,
      severity: "high",
    },
    {
      id: 2,
      type: "vulnerability",
      title: "发现中危漏洞",
      description: "test.com 存在 XSS 跨站脚本漏洞",
      detail: "在评论功能中发现反射型 XSS 漏洞，攻击者可以注入恶意脚本。",
      time: "15 分钟前",
      unread: true,
      severity: "medium",
    },
    {
      id: 3,
      type: "scan",
      title: "扫描任务完成",
      description: "域名 test.com 的安全扫描已完成",
      detail: "本次扫描发现 2 个高危漏洞，5 个中危漏洞，12 个低危漏洞。共扫描 156 个端点。",
      time: "1 小时前",
      unread: true,
    },
    {
      id: 4,
      type: "scan",
      title: "定时扫描启动",
      description: "已启动对 example.com 的定时扫描",
      detail: "预计需要 30 分钟完成，将扫描所有子域名和端点。",
      time: "2 小时前",
      unread: false,
    },
    {
      id: 5,
      type: "system",
      title: "系统更新",
      description: "系统已更新至 v2.0.1",
      detail: "本次更新包含：新增漏洞检测引擎、优化扫描性能、修复已知问题。",
      time: "3 小时前",
      unread: false,
    },
    {
      id: 6,
      type: "vulnerability",
      title: "发现低危漏洞",
      description: "api.example.com 信息泄露",
      detail: "服务器响应头泄露了详细的版本信息，建议配置服务器隐藏版本信息。",
      time: "5 小时前",
      unread: false,
      severity: "low",
    },
  ]

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
          <span className="sr-only">通知</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[440px] p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-base">通知</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="p-4">
            {renderNotificationList(notifications)}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
