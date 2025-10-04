"use client" // 标记为客户端组件

// 导入 React 和 Hooks
import React, { useState } from "react"
// 导入表格相关类型和组件
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
// 导入图标组件
import { MoreHorizontal, Eye, Edit, Trash2, Server, Globe, Network, Copy, Check, ChevronsUpDown } from "lucide-react"
// 导入 Tabler 图标
import { IconCircleCheckFilled, IconLoader } from "@tabler/icons-react"
// 导入提示组件
import { toast } from "sonner"

// 导入资产类型定义
import type { Asset } from "@/types/asset.types"

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string  // 日期格式化函数
  navigate: (path: string) => void            // 导航函数
  handleEdit: (asset: Asset) => void          // 编辑处理函数
  handleDelete: (asset: Asset) => void        // 删除处理函数
}

/**
 * 资产行操作组件
 * 提供查看、编辑、删除等操作
 */
function AssetRowActions({ 
  asset, 
  onView, 
  onEdit, 
  onDelete 
}: {
  asset: Asset
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
 * 支持排序功能的列头，参考 shadcn/ui 示例设计
 */
function DataTableColumnHeader({ 
  column, 
  title 
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
 * 资产类型图标组件
 */
function AssetTypeIcon({ type }: { type: string }) {
  switch (type.toLowerCase()) {
    case 'server':
    case '服务器':
      return <Server className="h-4 w-4" />
    case 'domain':
    case '域名':
      return <Globe className="h-4 w-4" />
    case 'endpoint':
    case '端点':
      return <Network className="h-4 w-4" />
    default:
      return <Server className="h-4 w-4" />
  }
}

/**
 * 资产状态徽章组件
 */
function AssetStatusBadge({ status }: { status: string }) {
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case '活跃':
      case 'secure':
      case '安全':
        return <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
      default:
        return <IconLoader />
    }
  }

  return (
    <Badge variant="outline" className="text-muted-foreground px-1.5">
      {getStatusIcon(status)}
      {status}
    </Badge>
  )
}

/**
 * 创建主资产表格列定义
 */
export const createMainAssetColumns = ({
  formatDate,
  navigate,
  handleEdit,
  handleDelete,
}: CreateColumnsProps): ColumnDef<Asset>[] => [
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
  
  // 资产名称列
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="资产名称" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">
        {row.getValue("name")}
      </div>
    ),
  },
  
  // 资产类型列
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="类型" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center space-x-2">
        <AssetTypeIcon type={row.getValue("type")} />
        <span>{row.getValue("type")}</span>
      </div>
    ),
  },
  
  // 状态列
  {
    accessorKey: "status",
    header: "状态",
    cell: ({ row }) => (
      <AssetStatusBadge status={row.getValue("status")} />
    ),
  },
  
  // IP地址列
  {
    accessorKey: "ip",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="IP地址" />
    ),
    cell: ({ row }) => {
      const ip = row.getValue("ip") as string
      return (
        <div className="font-mono text-sm">
          {ip || "-"}
        </div>
      )
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
      return (
        <div className="font-mono text-sm">
          {domain || "-"}
        </div>
      )
    },
  },
  
  // 端口列
  {
    accessorKey: "port",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="端口" />
    ),
    cell: ({ row }) => {
      const port = row.getValue("port") as number
      return (
        <div className="font-mono text-sm">
          {port || "-"}
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
  
  // 操作列
  {
    id: "actions",
    cell: ({ row }) => (
      <AssetRowActions
        asset={row.original}
        onView={() => navigate(`/assets/asset/${row.original.id}`)}
        onEdit={() => handleEdit(row.original)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]

/**
 * 创建子域名表格列定义
 */
export const createSubdomainColumns = ({
  formatDate,
  navigate,
  handleEdit,
  handleDelete,
}: CreateColumnsProps): ColumnDef<Asset>[] => [
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
    accessorKey: "domain",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="子域名" />
    ),
    cell: ({ row }) => {
      const domain = row.getValue("domain") as string
      const [copied, setCopied] = useState(false)
      
      const handleCopy = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(domain)
          setCopied(true)
          toast.success(`已复制: ${domain}`)
          // 2秒后恢复原状态
          setTimeout(() => setCopied(false), 2000)
        } catch (err) {
          toast.error("复制失败")
        }
      }

      return (
        <div className="flex items-center space-x-2">
          <span className="font-mono">{domain}</span>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 hover:bg-muted transition-colors ${
              copied ? "bg-muted" : ""
            }`}
            onClick={handleCopy}
            title={copied ? "已复制!" : "复制域名"}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      )
    },
  },
  
  // IP地址列
  {
    accessorKey: "ip",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="解析IP" />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-sm">
        {row.getValue("ip") || "-"}
      </div>
    ),
  },
  
  // 状态列
  {
    accessorKey: "status",
    header: "状态",
    cell: ({ row }) => (
      <AssetStatusBadge status={row.getValue("status")} />
    ),
  },
  
  // 发现时间列
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="发现时间" />
    ),
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {formatDate(row.getValue("createdAt"))}
      </div>
    ),
  },
  
  // 操作列
  {
    id: "actions",
    cell: ({ row }) => (
      <AssetRowActions
        asset={row.original}
        onView={() => navigate(`/assets/subdomain/${row.original.id}`)}
        onEdit={() => handleEdit(row.original)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]

/**
 * 创建端点表格列定义
 */
export const createEndpointColumns = ({
  formatDate,
  navigate,
  handleEdit,
  handleDelete,
}: CreateColumnsProps): ColumnDef<Asset>[] => [
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
  
  // 端点URL列
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="端点URL" />
    ),
    cell: ({ row }) => {
      const url = row.getValue("name") as string
      const [copied, setCopied] = useState(false)
      
      const handleCopy = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(url)
          setCopied(true)
          toast.success(`已复制: ${url}`)
          // 2秒后恢复原状态
          setTimeout(() => setCopied(false), 2000)
        } catch (err) {
          toast.error("复制失败")
        }
      }

      return (
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm font-medium">{url}</span>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 hover:bg-muted transition-colors ${
              copied ? "bg-muted" : ""
            }`}
            onClick={handleCopy}
            title={copied ? "已复制!" : "复制URL"}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      )
    },
  },
  
  // 域名列
  {
    accessorKey: "domain",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="域名" />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-sm">
        {row.getValue("domain") || "-"}
      </div>
    ),
  },
  
  // 端口列
  {
    accessorKey: "port",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="端口" />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-sm">
        {row.getValue("port") || "-"}
      </div>
    ),
  },
  
  // 状态列
  {
    accessorKey: "status",
    header: "状态",
    cell: ({ row }) => (
      <AssetStatusBadge status={row.getValue("status")} />
    ),
  },
  
  // 发现时间列
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="发现时间" />
    ),
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {formatDate(row.getValue("createdAt"))}
      </div>
    ),
  },
  
  // 操作列
  {
    id: "actions",
    cell: ({ row }) => (
      <AssetRowActions
        asset={row.original}
        onView={() => navigate(`/assets/endpoint/${row.original.id}`)}
        onEdit={() => handleEdit(row.original)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
