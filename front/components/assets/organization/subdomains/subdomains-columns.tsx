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
import { MoreHorizontal, Eye, Edit, Trash2, ChevronsUpDown } from "lucide-react"
import type { SubDomain } from "@/types/subdomain.types"

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string
  navigate: (path: string) => void
  handleEdit: (subdomain: SubDomain) => void
  handleDelete: (subdomain: SubDomain) => void
}

/**
 * 子域名行操作组件
 */
function SubdomainRowActions({
  subdomain,
  onView,
  onEdit,
  onDelete,
}: {
  subdomain: SubDomain
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
 * 创建子域名表格列定义
 */
export const createSubdomainColumns = ({
  formatDate,
  navigate,
  handleEdit,
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
      <div className="w-[80px] font-mono text-sm text-muted-foreground">
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
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },



  // 所属域名列
  {
    accessorKey: "domain",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="所属域名" />
    ),
    cell: ({ row }) => {
      const domain = row.getValue("domain") as any
      return (
        <div className="font-mono text-sm">
          {domain?.name || "-"}
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
      <SubdomainRowActions
        subdomain={row.original}
        onView={() => navigate(`/assets/subdomain/${row.original.id}`)}
        onEdit={() => handleEdit(row.original)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
