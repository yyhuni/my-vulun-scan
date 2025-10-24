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
import { MoreHorizontal, Eye, Trash2, Network, ChevronsUpDown, ChevronUp, ChevronDown, Globe, Code, Copy, Check } from "lucide-react"
import { IconCircleCheckFilled, IconLoader, IconAlertTriangle, IconX } from "@tabler/icons-react"
import type { Endpoint } from "@/types/endpoint.types"
import { toast } from "sonner"

/**
 * 可复制单元格组件
 */
function CopyableCell({ 
  value, 
  maxWidth = "500px", 
  truncateLength = 60,
  successMessage = "已复制",
  className = "font-mono"
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
            className={`text-xs ${className} ${isLong ? 'max-w-[500px] break-all' : 'whitespace-nowrap'}`}
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
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
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
  handleDelete: (endpoint: Endpoint) => void
}

/**
 * 端点行操作组件
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
          <MoreHorizontal />
          <span className="sr-only">打开菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          <Eye />
          查看详情
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 />
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
 * 创建端点表格列定义
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
      <div className="text-sm text-muted-foreground">
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
      return <CopyableCell value={url} maxWidth="500px" truncateLength={60} successMessage="已复制 URL" />
    },
  },

  // 路径列（从 URL 中提取路径）
  {
    accessorKey: "endpoint",
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="路径" />
    ),
    cell: ({ row }) => {
      const endpoint = row.getValue("endpoint") as string
      return <CopyableCell value={endpoint} maxWidth="400px" truncateLength={30} successMessage="已复制路径" />
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
              <div className="text-sm font-medium truncate cursor-default block max-w-xs">
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
