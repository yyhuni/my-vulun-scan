"use client" // 标记为客户端组件，可以使用浏览器 API 和交互功能

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
import { MoreHorizontal, Edit, Trash2, ChevronsUpDown, ChevronUp, ChevronDown, Eye } from "lucide-react"
// 导入 Next.js Link 组件
import Link from "next/link"

// 导入类型定义
import type { Domain } from "@/types/domain.types"

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string  // 日期格式化函数
  handleEdit: (domain: Domain) => void        // 编辑处理函数
  handleDelete: (domain: Domain) => void      // 删除处理函数
}

/**
 * 域名行操作组件
 * 提供查看详细、编辑、删除等操作
 */
function DomainRowActions({ 
  domain, 
  onEdit, 
  onDelete 
}: {
  domain: Domain
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
          <MoreHorizontal />
          <span className="sr-only">打开菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem asChild>
          <Link href={`/assets/domain/${domain.id}`} className="cursor-pointer">
            <Eye />
            查看详细
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onEdit}>
          <Edit />
          编辑
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

  const isSorted = column.getIsSorted()

  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="-ml-3 h-8 data-[state=open]:bg-accent"
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
 * 创建域名表格列定义
 * 
 * @param formatDate - 日期格式化函数
 * @param handleEdit - 编辑处理函数
 * @param handleDelete - 删除处理函数
 * @returns 表格列定义数组
 */
export const createDomainColumns = ({
  formatDate,
  handleEdit,
  handleDelete,
}: CreateColumnsProps): ColumnDef<Domain>[] => [
  // 选择列 - 支持单选和全选
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
    enableSorting: false,  // 禁用排序
    enableHiding: false,   // 禁用隐藏
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
  
  // 域名名称列
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="域名" />
    ),
    cell: ({ row }) => {
      const domain = row.original
      return (
        <Link 
          href={`/assets/domain/${domain.id}`}
          className="w-[200px] font-medium text-primary hover:underline block"
        >
          {row.getValue("name")}
        </Link>
      )
    },
  },
  
  // 域名描述列
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="描述" />
    ),
    cell: ({ row }) => {
      const description = row.getValue("description") as string
      return (
        <div className="flex space-x-2">
          <span className="max-w-[300px] truncate text-muted-foreground">
            {description || "-"}
          </span>
        </div>
      )
    },
  },
  
  // 所属组织列
  {
    accessorKey: "organizations",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="所属组织" />
    ),
    cell: ({ row }) => {
      const organizations = row.original.organizations || []
      
      if (organizations.length === 0) {
        return (
          <div className="text-sm text-muted-foreground">
            -
          </div>
        )
      }
      
      // 每个组织单独一行显示
      return (
        <div className="flex flex-col gap-1 py-1">
          {organizations.map((org) => (
            <Badge 
              key={org.id} 
              variant="secondary" 
              className="justify-start max-w-[200px] truncate text-xs"
              title={org.name}
            >
              {org.name}
            </Badge>
          ))}
        </div>
      )
    },
    // 启用排序：按第一个组织名称排序
    sortingFn: (rowA, rowB) => {
      const orgsA = rowA.original.organizations || []
      const orgsB = rowB.original.organizations || []
      
      // 如果没有组织，排到最后
      if (orgsA.length === 0 && orgsB.length === 0) return 0
      if (orgsA.length === 0) return 1
      if (orgsB.length === 0) return -1
      
      // 按第一个组织名称排序
      const nameA = orgsA[0].name.toLowerCase()
      const nameB = orgsB[0].name.toLowerCase()
      return nameA.localeCompare(nameB)
    },
  },
  
  // 更新时间列 - 使用驼峰命名（响应拦截器已自动转换）
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="更新时间" />
    ),
    cell: ({ row }) => {
      const updatedAt = row.getValue("updatedAt") as string | undefined
      // 检查是否为零值时间（Go 的 time.Time 零值）
      const isZeroTime = updatedAt && (
        updatedAt === "0001-01-01T00:00:00Z" ||
        updatedAt.startsWith("0001-01-01")
      )

      return (
        <div className="text-sm text-muted-foreground">
          {updatedAt && !isZeroTime ? formatDate(updatedAt) : (
            <Badge variant="secondary" className="text-xs">
              未更新
            </Badge>
          )}
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
        onEdit={() => handleEdit(row.original)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,  // 禁用排序
    enableHiding: false,   // 禁用隐藏
  },
]
