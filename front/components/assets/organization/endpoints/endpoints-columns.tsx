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
import { MoreHorizontal, Eye, Edit, Trash2, Network, ChevronsUpDown, Globe, Code } from "lucide-react"
import { IconCircleCheckFilled, IconLoader, IconAlertTriangle, IconX } from "@tabler/icons-react"
import type { Endpoint } from "@/types/endpoint.types"

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string
  navigate: (path: string) => void
  handleEdit: (endpoint: Endpoint) => void
  handleDelete: (endpoint: Endpoint) => void
}

/**
 * Endpoint 行操作组件
 */
function EndpointRowActions({
  endpoint,
  onView,
  onEdit,
  onDelete,
}: {
  endpoint: Endpoint
  onView: () => void
  onEdit: () => void
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
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          编辑
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
function HttpStatusBadge({ statusCode }: { statusCode: number }) {
  const getStatusInfo = (code: number) => {
    if (code >= 200 && code < 300) {
      return {
        icon: <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />,
        variant: "default" as const,
        className: "text-green-700 border-green-300 bg-green-50"
      }
    } else if (code >= 300 && code < 400) {
      return {
        icon: <IconLoader className="text-blue-500" />,
        variant: "secondary" as const,
        className: "text-blue-700 border-blue-300 bg-blue-50"
      }
    } else if (code >= 400 && code < 500) {
      return {
        icon: <IconAlertTriangle className="text-orange-500" />,
        variant: "destructive" as const,
        className: "text-orange-700 border-orange-300 bg-orange-50"
      }
    } else if (code >= 500) {
      return {
        icon: <IconX className="text-red-500" />,
        variant: "destructive" as const,
        className: "text-red-700 border-red-300 bg-red-50"
      }
    } else {
      return {
        icon: <IconLoader className="text-gray-500" />,
        variant: "outline" as const,
        className: "text-gray-700 border-gray-300 bg-gray-50"
      }
    }
  }

  const { icon, className } = getStatusInfo(statusCode)

  return (
    <Badge variant="outline" className={`px-2 py-1 ${className}`}>
      {icon}
      <span className="ml-1">{statusCode}</span>
    </Badge>
  )
}

/**
 * 创建 Endpoint 表格列定义
 */
export const createEndpointColumns = ({
  formatDate,
  navigate,
  handleEdit,
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
      <div className="w-[80px] font-mono text-sm text-muted-foreground">
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
      return (
        <div className="max-w-[300px] font-mono text-sm">
          <div className="truncate" title={url}>
            {url}
          </div>
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
        <Badge variant="outline" className={`font-mono ${getMethodColor(method)}`}>
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
      return (
        <div className="max-w-[200px]">
          <div className="truncate font-medium" title={title}>
            {title}
          </div>
        </div>
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
      const size = row.getValue("contentLength") as number
      return <div className="font-mono text-sm">{size}</div>
    },
  },

  // 域名列
  {
    accessorKey: "domain",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="域名" />
    ),
    cell: ({ row }) => {
      const domain = row.getValue("domain") as string
      return <div className="font-mono text-sm">{domain}</div>
    },
  },

  // 子域名列
  {
    accessorKey: "subdomain",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="子域名" />
    ),
    cell: ({ row }) => {
      const subdomain = row.getValue("subdomain") as string
      return (
        <div className="font-mono text-sm">
          {subdomain || "-"}
        </div>
      )
    },
  },

  // 创建时间列
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="创建时间" />
    ),
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {formatDate(row.getValue("createdAt"))}
      </div>
    ),
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
        onEdit={() => handleEdit(row.original)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
