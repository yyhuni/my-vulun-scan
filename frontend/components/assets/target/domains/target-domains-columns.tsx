"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MoreHorizontal, Star, Trash2, ChevronsUpDown, ChevronUp, ChevronDown, Copy, Check, Image } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Domain } from "@/types/domain.types"
import { toast } from "sonner"

/**
 * 可复制单元格组件
 */
function CopyableCell({ 
  value, 
  maxWidth = "400px", 
  truncateLength = 50,
  successMessage = "已复制",
  className = "font-medium"
}: { 
  value: string
  maxWidth?: string
  truncateLength?: number
  successMessage?: string
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)
  const isLong = value.length > truncateLength
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(successMessage)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }
  
  return (
    <div className="group inline-flex items-center gap-1" style={{ maxWidth }}>
      <TooltipProvider delayDuration={500} skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`text-sm truncate cursor-default ${className}`}>
              {value}
            </div>
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            align="start"
            sideOffset={5}
            className={`text-xs ${isLong ? 'max-w-[500px] break-all' : 'whitespace-nowrap'}`}
          >
            {value}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <TooltipProvider delayDuration={500} skipDelayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 flex-shrink-0 hover:bg-accent transition-opacity ${
                copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{copied ? '已复制!' : '点击复制'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string
  navigate: (path: string) => void
  handleDelete: (domain: Domain) => void
  handleMarkImportant: (domain: Domain) => void
}

/**
 * 域名行操作组件
 */
function DomainRowActions({
  domain,
  onMarkImportant,
  onDelete,
}: {
  domain: Domain
  onMarkImportant: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal />
          <span className="sr-only">打开菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onMarkImportant}>
          <Star />
          Mark Important Subdomain
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 />
          Delete Subdomain
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * 数据表格列头组件
 */
function DataTableColumnHeader({
  column,
  title,
}: {
  column: { getCanSort: () => boolean; getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void }
  title: string
}) {
  if (!column.getCanSort()) {
    return <div className="-ml-3 font-medium">{title}</div>
  }

  const isSorted = column.getIsSorted()

  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="-ml-3 h-8 data-[state=open]:bg-accent hover:bg-muted"
    >
      {title}
      {isSorted === "asc" ? (
        <ChevronUp />
      ) : isSorted === "desc" ? (
        <ChevronDown />
      ) : (
        <ChevronsUpDown />
      )}
    </Button>
  )
}

/**
 * 创建目标域名表格列定义
 */
export const createTargetDomainColumns = ({
  formatDate,
  navigate,
  handleDelete,
  handleMarkImportant,
}: CreateColumnsProps): ColumnDef<Domain>[] => [
  // 选择列
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  // 子域名列
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subdomain" />
    ),
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      return <CopyableCell value={name} maxWidth="300px" truncateLength={40} successMessage="已复制子域名" />
    },
  },

  // 状态列
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string | undefined
      if (!status) {
        return <span className="text-sm text-muted-foreground">-</span>
      }
      
      // 根据状态码选择颜色
      const getStatusVariant = (code: string) => {
        const statusCode = parseInt(code)
        if (statusCode >= 200 && statusCode < 300) return "default" // 成功 - 蓝色
        if (statusCode >= 300 && statusCode < 400) return "secondary" // 重定向 - 灰色
        if (statusCode >= 400 && statusCode < 500) return "destructive" // 客户端错误 - 红色
        if (statusCode >= 500) return "destructive" // 服务器错误 - 红色
        return "outline"
      }
      
      return (
        <Badge variant={getStatusVariant(status)} className="font-mono">
          {status}
        </Badge>
      )
    },
  },

  // 标题列
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => {
      const title = row.getValue("title") as string | undefined
      if (!title) {
        return <span className="text-sm text-muted-foreground">-</span>
      }
      return <CopyableCell value={title} maxWidth="250px" truncateLength={35} successMessage="已复制标题" className="text-sm" />
    },
  },

  // IP列
  {
    accessorKey: "ip",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="IP" />
    ),
    cell: ({ row }) => {
      const ip = row.getValue("ip") as string | undefined
      if (!ip) {
        return <span className="text-sm text-muted-foreground">-</span>
      }
      
      const [copied, setCopied] = React.useState(false)
      
      const handleCopy = async () => {
        try {
          await navigator.clipboard.writeText(ip)
          setCopied(true)
          toast.success('已复制IP')
          setTimeout(() => setCopied(false), 2000)
        } catch {
          toast.error('复制失败')
        }
      }
      
      return (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="secondary" 
                className="font-mono cursor-pointer hover:bg-secondary/80"
                onClick={handleCopy}
              >
                {ip}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{copied ? '已复制!' : '点击复制'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
  },

  // 端口列
  {
    accessorKey: "ports",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ports" />
    ),
    cell: ({ row }) => {
      const ports = row.getValue("ports") as number[] | undefined
      if (!ports || ports.length === 0) {
        return <span className="text-sm text-muted-foreground">-</span>
      }
      
      // 端口到服务名称的映射
      const getServiceName = (port: number): string => {
        const serviceMap: Record<number, string> = {
          20: 'ftp-data',
          21: 'ftp',
          22: 'ssh',
          23: 'telnet',
          25: 'smtp',
          53: 'dns',
          80: 'http',
          110: 'pop3',
          143: 'imap',
          179: 'bgp',
          443: 'https',
          445: 'smb',
          465: 'smtps',
          587: 'smtp',
          993: 'imaps',
          995: 'pop3s',
          1433: 'mssql',
          3306: 'mysql',
          3389: 'rdp',
          5432: 'postgresql',
          5900: 'vnc',
          6379: 'redis',
          8080: 'http-alt',
          8443: 'https-alt',
          27017: 'mongodb',
        }
        return serviceMap[port] || ''
      }
      
      const displayPorts = ports.slice(0, 3)
      const remainingCount = ports.length - 3
      
      return (
        <div className="flex flex-wrap gap-1">
          {displayPorts.map((port) => {
            const service = getServiceName(port)
            return (
              <Badge 
                key={port} 
                variant="outline" 
                className="font-mono text-xs"
              >
                {port}{service && `/${service}`}
              </Badge>
            )
          })}
          {remainingCount > 0 && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="secondary" 
                    className="text-xs cursor-default"
                  >
                    +{remainingCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="flex flex-wrap gap-1">
                    {ports.slice(3).map((port) => {
                      const service = getServiceName(port)
                      return (
                        <span key={port} className="text-xs font-mono">
                          {port}{service && `/${service}`}
                        </span>
                      )
                    })}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )
    },
  },

  // 内容长度列
  {
    accessorKey: "contentLength",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Content Length" />
    ),
    cell: ({ row }) => {
      const contentLength = row.getValue("contentLength") as number | undefined
      if (!contentLength) {
        return <span className="text-sm text-muted-foreground">-</span>
      }
      return (
        <div className="text-sm text-muted-foreground font-mono">
          {contentLength.toLocaleString()}
        </div>
      )
    },
  },

  // 截图列
  {
    accessorKey: "screenshot",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Screenshot" />
    ),
    cell: ({ row }) => {
      const screenshot = row.getValue("screenshot") as string | undefined
      if (!screenshot) {
        return <span className="text-sm text-muted-foreground">-</span>
      }
      return (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => window.open(screenshot, '_blank')}
              >
                <Image className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">点击查看截图</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
  },

  // 响应时间列
  {
    accessorKey: "responseTime",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Response Time" />
    ),
    cell: ({ row }) => {
      const responseTime = row.getValue("responseTime") as number | undefined
      if (!responseTime) {
        return <span className="text-sm text-muted-foreground">-</span>
      }
      return (
        <div className="text-sm text-muted-foreground">
          {responseTime}ms
        </div>
      )
    },
  },

  // 操作列
  {
    id: "actions",
    cell: ({ row }) => (
      <DomainRowActions
        domain={row.original}
        onMarkImportant={() => handleMarkImportant(row.original)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
