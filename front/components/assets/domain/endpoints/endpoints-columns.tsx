"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { MoreHorizontal, Eye, Trash2, Network, ChevronsUpDown, Globe, Code, Copy, Check } from "lucide-react"
import { IconCircleCheckFilled, IconLoader, IconAlertTriangle, IconX } from "@tabler/icons-react"
import type { Endpoint } from "@/types/endpoint.types"
import { toast } from "sonner"

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string
  navigate: (path: string) => void
  handleDelete: (endpoint: Endpoint) => void
}

/**
 * Endpoint 行操作组件
 */
function EndpointRowActions({
  endpoint,
  onView,
  onDelete,
}: {
  endpoint: Endpoint
  onView: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">打开菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem onClick={onView}>
          <Eye className="mr-2 h-4 w-4" />
          查看详情
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          删除
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
  column: any
  title: string
}) {
  if (!column.getCanSort()) {
    return <div className="-ml-3 font-medium">{title}</div>
  }

  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="-ml-3 h-8 data-[state=open]:bg-accent hover:bg-muted"
    >
      {title}
      <ChevronsUpDown className="h-4 w-4" />
    </Button>
  )
}

/**
 * HTTP 状态码徽章组件
 */
function HttpStatusBadge({ statusCode }: { statusCode: number | null | undefined }) {
  // 处理空值情况
  if (statusCode === null || statusCode === undefined) {
    return (
      <Badge variant="outline" className="px-2 py-1 text-gray-700 border-gray-300 bg-gray-50">
        -
      </Badge>
    )
  }

  const getStatusInfo = (code: number) => {
    if (code >= 200 && code < 300) {
      return {
        className: "text-green-700 border-green-300 bg-green-50"
      }
    } else if (code >= 300 && code < 400) {
      return {
        className: "text-blue-700 border-blue-300 bg-blue-50"
      }
    } else if (code >= 400 && code < 500) {
      return {
        className: "text-orange-700 border-orange-300 bg-orange-50"
      }
    } else if (code >= 500) {
      return {
        className: "text-red-700 border-red-300 bg-red-50"
      }
    } else {
      return {
        className: "text-gray-700 border-gray-300 bg-gray-50"
      }
    }
  }

  const { className } = getStatusInfo(statusCode)

  return (
    <Badge variant="outline" className={`px-2 py-1 ${className}`}>
      {statusCode}
    </Badge>
  )
}

/**
 * 创建 Endpoint 表格列定义
 */
export const createEndpointColumns = ({
  formatDate,
  navigate,
  handleDelete,
}: CreateColumnsProps): ColumnDef<Endpoint>[] => [
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

  // ID 列
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => (
      <div className="w-[80px] text-sm text-muted-foreground">
        {row.getValue("id")}
      </div>
    ),
  },

  // URL 列
  {
    accessorKey: "url",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="URL" />
    ),
    cell: ({ row }) => {
      const url = row.getValue("url") as string
      const isLong = url.length > 60
      const [copied, setCopied] = React.useState(false)
      
      const handleCopy = async () => {
        try {
          await navigator.clipboard.writeText(url)
          setCopied(true)
          toast.success('已复制 URL')
          setTimeout(() => setCopied(false), 2000)
        } catch (err) {
          toast.error('复制失败')
        }
      }
      
      return (
        <div className="flex items-center gap-2 group">
          <TooltipProvider delayDuration={500} skipDelayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm font-mono max-w-[400px] truncate cursor-default inline-block">
                  {url}
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                align="start"
                sideOffset={5}
                className={`text-xs font-mono ${isLong ? 'max-w-[500px] break-all' : 'whitespace-nowrap'}`}
              >
                {url}
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
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{copied ? '已复制' : '复制'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    },
  },

  // Endpoint 列（从 URL 中提取路径）
  {
    id: "endpoint",
    accessorFn: (row) => {
      // 提供访问器函数用于排序
      const getEndpointPath = (fullUrl: string) => {
        try {
          const urlObj = new URL(fullUrl)
          return urlObj.pathname + urlObj.search + urlObj.hash
        } catch {
          // 如果 URL 解析失败，尝试简单的字符串处理
          const match = fullUrl.match(/^https?:\/\/[^\/]+(.*)$/)
          return match ? match[1] || '/' : fullUrl
        }
      }
      return getEndpointPath(row.url)
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Endpoint" />
    ),
    cell: ({ row }) => {
      const endpoint = row.getValue("endpoint") as string
      const isLong = endpoint.length > 30
      const [copied, setCopied] = React.useState(false)
      
      const handleCopy = async () => {
        try {
          await navigator.clipboard.writeText(endpoint)
          setCopied(true)
          toast.success('已复制 Endpoint')
          setTimeout(() => setCopied(false), 2000)
        } catch (err) {
          toast.error('复制失败')
        }
      }
      
      return (
        <div className="flex items-center gap-2 group">
          <TooltipProvider delayDuration={500} skipDelayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm font-mono max-w-[200px] truncate cursor-default inline-block">
                  {endpoint}
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                align="start"
                sideOffset={5}
                className={`text-xs font-mono ${isLong ? 'max-w-[400px] break-all' : 'whitespace-nowrap'}`}
              >
                {endpoint}
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
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{copied ? '已复制' : '复制'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    },
  },

  // HTTP 方法列
  {
    accessorKey: "method",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="方法" />
    ),
    cell: ({ row }) => {
      const method = row.getValue("method") as string
      const getMethodColor = (method: string) => {
        switch (method.toUpperCase()) {
          case "GET": return "bg-green-100 text-green-800 border-green-200"
          case "POST": return "bg-blue-100 text-blue-800 border-blue-200"
          case "PUT": return "bg-orange-100 text-orange-800 border-orange-200"
          case "DELETE": return "bg-red-100 text-red-800 border-red-200"
          case "PATCH": return "bg-purple-100 text-purple-800 border-purple-200"
          default: return "bg-gray-100 text-gray-800 border-gray-200"
        }
      }
      return (
        <Badge variant="outline" className={getMethodColor(method)}>
          {method}
        </Badge>
      )
    },
  },

  // 状态码列
  {
    accessorKey: "statusCode",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="状态码" />
    ),
    cell: ({ row }) => <HttpStatusBadge statusCode={row.getValue("statusCode")} />,
  },

  // 标题列
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="标题" />
    ),
    cell: ({ row }) => {
      const title = row.getValue("title") as string
      if (!title) return <div className="text-sm text-muted-foreground">-</div>
      
      const isLong = title.length > 30
      
      return (
        <TooltipProvider delayDuration={500} skipDelayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-sm font-medium max-w-[200px] truncate cursor-default inline-block">
                {title}
              </div>
            </TooltipTrigger>
            <TooltipContent 
              side="top" 
              align="start"
              sideOffset={5}
              className={`text-xs ${isLong ? 'max-w-[400px] break-all' : 'whitespace-nowrap'}`}
            >
              {title}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
  },

  // 内容长度列
  {
    accessorKey: "contentLength",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="内容大小(字节)" />
    ),
    cell: ({ row }) => {
      const size = row.getValue("contentLength") as number | null | undefined
      return (
        <div className="text-sm">
          {size !== null && size !== undefined ? size : "-"}
        </div>
      )
    },
  },

  // 更新时间列
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="更新时间" />
    ),
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {formatDate(row.getValue("updatedAt"))}
      </div>
    ),
  },

  // 操作列
  {
    id: "actions",
    cell: ({ row }) => (
      <EndpointRowActions
        endpoint={row.original}
        onView={() => navigate(`/assets/endpoint/${row.original.id}`)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
