"use client"

import * as React from "react"
import { Bell, Check, CheckCheck, Trash2, X, AlertTriangle, Activity, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

// 通知类型
type NotificationType = "vulnerability" | "scan" | "system"

// 通知接口
interface Notification {
  id: number
  type: NotificationType
  title: string
  description: string
  detail?: string
  time: string
  unread: boolean
  severity?: "high" | "medium" | "low"
}

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

  const unreadCount = notifications.filter((n) => n.unread).length
  const vulnerabilityNotifications = notifications.filter((n) => n.type === "vulnerability")
  const scanNotifications = notifications.filter((n) => n.type === "scan")
  const systemNotifications = notifications.filter((n) => n.type === "system")

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
      return <Activity className="h-5 w-5 text-blue-500" />
    }
    return <Info className="h-5 w-5 text-gray-500" />
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
      <div className="space-y-2">
        {notificationList.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "group relative rounded-lg border p-4 transition-colors hover:bg-accent",
              notification.unread && "bg-blue-50/50 dark:bg-blue-950/20"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getNotificationIcon(notification.type, notification.severity)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium leading-none">
                    {notification.title}
                    {getSeverityBadge(notification.severity)}
                    {notification.unread && (
                      <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-600" />
                    )}
                  </p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {notification.time}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {notification.description}
                </p>
                {notification.detail && (
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {notification.detail}
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      // TODO: 标记为已读
                      console.log("标记已读:", notification.id)
                    }}
                  >
                    <Check className="mr-1 h-3 w-3" />
                    标记已读
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => {
                      // TODO: 删除通知
                      console.log("删除:", notification.id)
                    }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    删除
                  </Button>
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
              className="absolute -right-1 -top-1 h-5 min-w-[1.25rem] rounded-full px-1 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">通知</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[540px] p-0">
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>通知中心</SheetTitle>
              <SheetDescription>
                {unreadCount > 0 ? `您有 ${unreadCount} 条未读通知` : "暂无未读通知"}
              </SheetDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // TODO: 全部标记为已读
                  console.log("全部标记为已读")
                }}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                全部已读
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="all" className="flex-1">
          <div className="border-b px-6">
            <TabsList className="w-full justify-start rounded-none border-b-0 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                全部
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {notifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="vulnerability"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                漏洞
                {vulnerabilityNotifications.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {vulnerabilityNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="scan"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                扫描
                {scanNotifications.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {scanNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                系统
                {systemNotifications.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {systemNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="p-6">
              <TabsContent value="all" className="mt-0">
                {renderNotificationList(notifications)}
              </TabsContent>
              <TabsContent value="vulnerability" className="mt-0">
                {renderNotificationList(vulnerabilityNotifications)}
              </TabsContent>
              <TabsContent value="scan" className="mt-0">
                {renderNotificationList(scanNotifications)}
              </TabsContent>
              <TabsContent value="system" className="mt-0">
                {renderNotificationList(systemNotifications)}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <div className="border-t p-4">
          <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
            查看全部通知
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
