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
import { MoreHorizontal, Eye, Edit, Trash2, ArrowUpDown } from "lucide-react"

// 组织数据类型定义
interface Organization {
  id: number
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string  // 日期格式化函数
  navigate: (path: string) => void            // 导航函数
  handleEdit: (org: Organization) => void     // 编辑处理函数
  handleDelete: (org: Organization) => void   // 删除处理函数
}

/**
 * 组织行操作组件
 * 提供查看、编辑、删除等操作
 */
function OrganizationRowActions({ 
  organization, 
  onView, 
  onEdit, 
  onDelete 
}: {
  organization: Organization
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
      <ArrowUpDown className="ml-1 h-4 w-4" />
    </Button>
  )
}

/**
 * 创建组织表格列定义
 * 
 * @param formatDate - 日期格式化函数
 * @param navigate - 页面导航函数
 * @param handleEdit - 编辑处理函数
 * @param handleDelete - 删除处理函数
 * @returns 表格列定义数组
 */
export const createOrganizationColumns = ({
  formatDate,
  navigate,
  handleEdit,
  handleDelete,
}: CreateColumnsProps): ColumnDef<Organization>[] => [
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
  
  // 组织名称列
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="组织名称" />
    ),
    cell: ({ row }) => (
      <div className="w-[150px] font-medium">
        <Button
          variant="link"
          className="p-0 h-auto font-medium text-left justify-start"
          onClick={() => navigate(`/assets/organization/${row.original.id}`)}
        >
          {row.getValue("name")}
        </Button>
      </div>
    ),
  },
  
  // 组织描述列
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
      <OrganizationRowActions
        organization={row.original}
        onView={() => navigate(`/assets/organization/${row.original.id}`)}
        onEdit={() => handleEdit(row.original)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,  // 禁用排序
    enableHiding: false,   // 禁用隐藏
  },
]
