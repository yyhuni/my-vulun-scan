"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import {
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconPlugConnected,
} from "@tabler/icons-react"
import type { Proxy, ProxyType } from "@/types/proxy.types"

// 代理类型颜色映射
const proxyTypeColors: Record<ProxyType, string> = {
  http: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  https: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  socks4: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  socks5: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
}

// 代理类型标签
const proxyTypeLabels: Record<ProxyType, string> = {
  http: "HTTP",
  https: "HTTPS",
  socks4: "SOCKS4",
  socks5: "SOCKS5",
}

interface CreateProxyColumnsProps {
  formatDate: (dateString: string) => string
  onEdit: (proxy: Proxy) => void
  onDelete: (proxy: Proxy) => void
  onTest: (proxy: Proxy) => void
  onToggleEnabled: (proxy: Proxy, enabled: boolean) => void
}

/**
 * 创建代理表格列定义
 */
export function createProxyColumns({
  formatDate,
  onEdit,
  onDelete,
  onTest,
  onToggleEnabled,
}: CreateProxyColumnsProps): ColumnDef<Proxy>[] {
  return [
    {
      accessorKey: "name",
      header: "名称",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "type",
      header: "类型",
      cell: ({ row }) => {
        const type = row.getValue("type") as ProxyType
        return (
          <Badge variant="outline" className={proxyTypeColors[type]}>
            {proxyTypeLabels[type]}
          </Badge>
        )
      },
    },
    {
      accessorKey: "host",
      header: "地址",
      cell: ({ row }) => {
        const proxy = row.original
        return (
          <code className="text-sm bg-muted px-2 py-1 rounded">
            {proxy.host}:{proxy.port}
          </code>
        )
      },
    },
    {
      accessorKey: "username",
      header: "认证",
      cell: ({ row }) => {
        const username = row.getValue("username") as string | undefined
        return username ? (
          <Badge variant="secondary">需要认证</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      },
    },
    {
      accessorKey: "lastTestResult",
      header: "测试状态",
      cell: ({ row }) => {
        const proxy = row.original
        if (proxy.lastTestedAt === undefined) {
          return <span className="text-muted-foreground">未测试</span>
        }
        return proxy.lastTestResult ? (
          <Badge variant="default" className="bg-green-500">
            可用
          </Badge>
        ) : (
          <Badge variant="destructive">不可用</Badge>
        )
      },
    },
    {
      accessorKey: "isEnabled",
      header: "状态",
      cell: ({ row }) => {
        const proxy = row.original
        return (
          <Switch
            checked={proxy.isEnabled}
            onCheckedChange={(checked) => onToggleEnabled(proxy, checked)}
          />
        )
      },
    },
    {
      accessorKey: "updatedAt",
      header: "更新时间",
      cell: ({ row }) => {
        const value = row.getValue("updatedAt") as string
        return value ? formatDate(value) : "-"
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const proxy = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <IconDotsVertical className="h-4 w-4" />
                <span className="sr-only">打开菜单</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTest(proxy)}>
                <IconPlugConnected className="mr-2 h-4 w-4" />
                测试连接
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(proxy)}>
                <IconPencil className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(proxy)}
                className="text-destructive focus:text-destructive"
              >
                <IconTrash className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
