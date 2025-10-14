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
import { MoreHorizontal, Eye, Trash2, ChevronsUpDown, ChevronUp, ChevronDown, Copy, Check } from "lucide-react"
import type { SubDomain } from "@/types/subdomain.types"
import { toast } from "sonner"

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string
  navigate: (path: string) => void
  handleDelete: (subdomain: SubDomain) => void
}

/**
 * 子域名行操作组件
 */
function SubdomainRowActions({
  subdomain,
  onView,
  onDelete,
}: {
  subdomain: SubDomain
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
  column: any
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
 * 创建子域名表格列定义
 */
export const createSubdomainColumns = ({
  formatDate,
  navigate,
  handleDelete,
}: CreateColumnsProps): ColumnDef<SubDomain>[] => [
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

  // 子域名列
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="子域名" />
    ),
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      const isLong = name.length > 50 // 判断内容是否较长
      const [copied, setCopied] = React.useState(false)
      
      const handleCopy = async () => {
        try {
          await navigator.clipboard.writeText(name)
          setCopied(true)
          toast.success('已复制子域名')
          setTimeout(() => setCopied(false), 2000) // 2秒后恢复
        } catch (err) {
          toast.error('复制失败')
        }
      }
      
      return (
        <div className="flex items-center gap-2 max-w-md">
          <TooltipProvider delayDuration={500} skipDelayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm font-medium truncate cursor-default min-w-0 flex-1">
                  {name}
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                align="start"
                sideOffset={5}
                className={`text-xs ${isLong ? 'max-w-[500px] break-all' : 'whitespace-nowrap'}`}
              >
                {name}
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
                    <Check className="text-green-600" />
                  ) : (
                    <Copy className="text-muted-foreground" />
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



  // 所属域名列
  {
    accessorKey: "domain",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="所属域名" />
    ),
    cell: ({ row }) => {
      const domain = row.getValue("domain") as any
      const domainName = domain?.name || "-"
      
      return (
        <div className="text-sm truncate">
          {domainName}
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
      <SubdomainRowActions
        subdomain={row.original}
        onView={() => navigate(`/assets/subdomain/${row.original.id}`)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
