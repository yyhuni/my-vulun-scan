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
} from "lucide-react"
import {
  IconClock,
  IconCircleCheck,
  IconCircleX,
  IconLoader,
} from "@tabler/icons-react"
import { toast } from "sonner"

// 扫描状态类型
export type ScanStatus = "pending" | "running" | "completed" | "failed"

// 扫描记录类型
export interface ScanRecord {
  id: number
  name: string
  type: string
  targets: string[]
  status: ScanStatus
  startTime: string
  endTime?: string
  duration?: string
  findings: number
}

/**
 * 可复制单元格组件
 */
function CopyableCell({ 
  value, 
  maxWidth = "300px", 
  truncateLength = 40,
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
                <Check className="h-3.5 w-3.5 text-green-600" />
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

/**
 * 状态徽章组件
 */
function StatusBadge({ status }: { status: ScanStatus }) {
  const config = {
    pending: {
      icon: IconClock,
      label: "等待中",
      className: "bg-yellow-50 text-yellow-700 border-yellow-300",
    },
    running: {
      icon: IconLoader,
      label: "运行中",
      className: "bg-blue-50 text-blue-700 border-blue-300 animate-pulse",
    },
    completed: {
      icon: IconCircleCheck,
      label: "已完成",
      className: "bg-green-50 text-green-700 border-green-300",
    },
    failed: {
      icon: IconCircleX,
      label: "失败",
      className: "bg-red-50 text-red-700 border-red-300",
    },
  }

  const { icon: Icon, label, className } = config[status]

  return (
    <Badge variant="outline" className={className}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  )
}

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string
  navigate: (path: string) => void
  handleDelete: (scan: ScanRecord) => void
}

/**
 * 扫描记录行操作组件
 */
function ScanRowActions({
  scan,
  onView,
  onDelete,
}: {
  scan: ScanRecord
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
 * 创建扫描历史表格列定义
 */
export const createScanHistoryColumns = ({
  formatDate,
  navigate,
  handleDelete,
}: CreateColumnsProps): ColumnDef<ScanRecord>[] => [
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

  // 扫描名称列
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="扫描名称" />
    ),
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      return <CopyableCell value={name} maxWidth="300px" truncateLength={40} successMessage="已复制扫描名称" />
    },
  },

  // 类型列
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="类型" />
    ),
    cell: ({ row }) => {
      const type = row.getValue("type") as string
      return (
        <Badge variant="secondary" className="font-normal">
          {type}
        </Badge>
      )
    },
  },

  // 目标列
  {
    accessorKey: "targets",
    header: "目标",
    cell: ({ row }) => {
      const targets = row.getValue("targets") as string[]
      return (
        <div className="flex flex-wrap gap-1">
          {targets.slice(0, 2).map((target, idx) => (
            <Badge key={idx} variant="outline" className="text-xs font-mono">
              {target}
            </Badge>
          ))}
          {targets.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{targets.length - 2}
            </Badge>
          )}
        </div>
      )
    },
    enableSorting: false,
  },

  // 状态列
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="状态" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as ScanStatus
      return <StatusBadge status={status} />
    },
  },

  // 开始时间列
  {
    accessorKey: "startTime",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="开始时间" />
    ),
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {formatDate(row.getValue("startTime"))}
      </div>
    ),
  },

  // 持续时间列
  {
    accessorKey: "duration",
    header: "持续时间",
    cell: ({ row }) => {
      const duration = row.getValue("duration") as string | undefined
      return (
        <div className="text-sm text-muted-foreground">
          {duration || "-"}
        </div>
      )
    },
    enableSorting: false,
  },

  // 发现问题列
  {
    accessorKey: "findings",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="发现问题" />
    ),
    cell: ({ row }) => {
      const findings = row.getValue("findings") as number
      return (
        <Badge variant={findings > 0 ? "destructive" : "secondary"}>
          {findings}
        </Badge>
      )
    },
  },

  // 操作列
  {
    id: "actions",
    cell: ({ row }) => (
      <ScanRowActions
        scan={row.original}
        onView={() => navigate(`/scan/history/${row.original.id}`)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
