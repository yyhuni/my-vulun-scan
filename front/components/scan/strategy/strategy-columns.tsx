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
import {
  MoreHorizontal,
  Eye,
  Trash2,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
  Edit,
} from "lucide-react"
import {
  IconTarget,
  IconBolt,
  IconSettings,
} from "@tabler/icons-react"
import { toast } from "sonner"
import type { ScanStrategy, StrategyType } from "@/types/strategy.types"

/**
 * 可复制单元格组件
 */
function CopyableCell({
  value,
  maxWidth = "300px",
  truncateLength = 40,
  successMessage = "已复制",
  className = "font-medium",
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
      toast.error("复制失败")
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
            className={`text-xs ${
              isLong ? "max-w-[500px] break-all" : "whitespace-nowrap"
            }`}
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
                copied ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{copied ? "已复制!" : "点击复制"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

/**
 * 策略类型徽章组件
 */
function StrategyTypeBadge({ type }: { type: StrategyType }) {
  const config = {
    comprehensive: {
      icon: IconTarget,
      label: "全面扫描",
      className: "bg-purple-50 text-purple-700 border-purple-300",
    },
    quick: {
      icon: IconBolt,
      label: "快速扫描",
      className: "bg-blue-50 text-blue-700 border-blue-300",
    },
    custom: {
      icon: IconSettings,
      label: "自定义扫描",
      className: "bg-orange-50 text-orange-700 border-orange-300",
    },
  }

  const { icon: Icon, label, className } = config[type]

  return (
    <Badge variant="outline" className={className}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  )
}

/**
 * 数据表格列头组件
 */
function DataTableColumnHeader({
  column,
  title,
}: {
  column: {
    getCanSort: () => boolean
    getIsSorted: () => false | "asc" | "desc"
    toggleSorting: (desc?: boolean) => void
  }
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

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string
  handleView: (strategy: ScanStrategy) => void
  handleEdit: (strategy: ScanStrategy) => void
  handleDelete: (strategy: ScanStrategy) => void
}

/**
 * 策略行操作组件
 */
function StrategyRowActions({
  strategy,
  onView,
  onEdit,
  onDelete,
}: {
  strategy: ScanStrategy
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
          <MoreHorizontal />
          <span className="sr-only">打开菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          <Eye />
          查看详情
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Edit />
          编辑策略
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
 * 创建策略表格列定义
 */
export const createStrategyColumns = ({
  formatDate,
  handleView,
  handleEdit,
  handleDelete,
}: CreateColumnsProps): ColumnDef<ScanStrategy>[] => [
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

  // 策略名称列
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="策略名称" />
    ),
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      return (
        <CopyableCell
          value={name}
          maxWidth="300px"
          truncateLength={40}
          successMessage="已复制策略名称"
        />
      )
    },
  },

  // 类型列
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="类型" />
    ),
    cell: ({ row }) => {
      const type = row.getValue("type") as StrategyType
      return <StrategyTypeBadge type={type} />
    },
  },

  // 描述列
  {
    accessorKey: "description",
    header: "描述",
    cell: ({ row }) => {
      const description = row.getValue("description") as string | undefined
      return (
        <div className="max-w-[300px] text-sm text-muted-foreground truncate">
          {description || "-"}
        </div>
      )
    },
    enableSorting: false,
  },

  // 关联工具列
  {
    accessorKey: "tools",
    header: "关联工具",
    cell: ({ row }) => {
      const tools = row.getValue("tools") as string[]
      if (!tools || tools.length === 0) {
        return <div className="text-sm text-muted-foreground">-</div>
      }
      return (
        <div className="flex flex-wrap gap-1 max-w-[250px]">
          {tools.slice(0, 3).map((tool, idx) => (
            <Badge key={idx} variant="outline" className="text-xs font-normal">
              {tool}
            </Badge>
          ))}
          {tools.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{tools.length - 3}
            </Badge>
          )}
        </div>
      )
    },
    enableSorting: false,
  },

  // 更新时间列
  {
    accessorKey: "updated_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="更新时间" />
    ),
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {formatDate(row.getValue("updated_at"))}
      </div>
    ),
  },

  // 操作列
  {
    id: "actions",
    cell: ({ row }) => (
      <StrategyRowActions
        strategy={row.original}
        onView={() => handleView(row.original)}
        onEdit={() => handleEdit(row.original)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
