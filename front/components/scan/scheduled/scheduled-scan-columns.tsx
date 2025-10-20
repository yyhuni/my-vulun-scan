"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
  Clock,
} from "lucide-react"
import {
  IconClock,
  IconCalendar,
  IconCalendarRepeat,
  IconCalendarTime,
  IconAdjustments,
} from "@tabler/icons-react"
import { toast } from "sonner"
import type {
  ScheduledScan,
  ScheduleFrequency,
} from "@/types/scheduled-scan.types"

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
 * 执行频率徽章组件
 */
function FrequencyBadge({ frequency }: { frequency: ScheduleFrequency }) {
  const config = {
    once: {
      icon: IconClock,
      label: "仅一次",
      className: "bg-gray-50 text-gray-700 border-gray-300",
    },
    daily: {
      icon: IconCalendar,
      label: "每天",
      className: "bg-blue-50 text-blue-700 border-blue-300",
    },
    weekly: {
      icon: IconCalendarRepeat,
      label: "每周",
      className: "bg-green-50 text-green-700 border-green-300",
    },
    monthly: {
      icon: IconCalendarTime,
      label: "每月",
      className: "bg-purple-50 text-purple-700 border-purple-300",
    },
    custom: {
      icon: IconAdjustments,
      label: "自定义",
      className: "bg-orange-50 text-orange-700 border-orange-300",
    },
  }

  const { icon: Icon, label, className } = config[frequency]

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
  handleView: (scan: ScheduledScan) => void
  handleEdit: (scan: ScheduledScan) => void
  handleDelete: (scan: ScheduledScan) => void
  handleToggleStatus: (scan: ScheduledScan, enabled: boolean) => void
}

/**
 * 定时扫描行操作组件
 */
function ScheduledScanRowActions({
  scan,
  onView,
  onEdit,
  onDelete,
}: {
  scan: ScheduledScan
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
          编辑任务
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
 * 创建定时扫描表格列定义
 */
export const createScheduledScanColumns = ({
  formatDate,
  handleView,
  handleEdit,
  handleDelete,
  handleToggleStatus,
}: CreateColumnsProps): ColumnDef<ScheduledScan>[] => [
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

  // 任务名称列
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="任务名称" />
    ),
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      return (
        <CopyableCell
          value={name}
          maxWidth="250px"
          truncateLength={35}
          successMessage="已复制任务名称"
        />
      )
    },
  },

  // 扫描策略列
  {
    accessorKey: "strategy_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="扫描策略" />
    ),
    cell: ({ row }) => {
      const strategyName = row.getValue("strategy_name") as string
      return (
        <Badge variant="secondary" className="font-normal">
          {strategyName}
        </Badge>
      )
    },
  },

  // 执行频率列
  {
    accessorKey: "frequency",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="执行频率" />
    ),
    cell: ({ row }) => {
      const frequency = row.getValue("frequency") as ScheduleFrequency
      return <FrequencyBadge frequency={frequency} />
    },
  },

  // 目标域名列
  {
    accessorKey: "target_domains",
    header: "目标域名",
    cell: ({ row }) => {
      const domains = row.getValue("target_domains") as string[]
      if (!domains || domains.length === 0) {
        return <div className="text-sm text-muted-foreground">-</div>
      }
      return (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {domains.slice(0, 2).map((domain, idx) => (
            <Badge key={idx} variant="outline" className="text-xs font-mono font-normal">
              {domain}
            </Badge>
          ))}
          {domains.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{domains.length - 2}
            </Badge>
          )}
        </div>
      )
    },
    enableSorting: false,
  },

  // 启用状态列
  {
    accessorKey: "is_enabled",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="状态" />
    ),
    cell: ({ row }) => {
      const isEnabled = row.getValue("is_enabled") as boolean
      const scan = row.original
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked: boolean) =>
              handleToggleStatus(scan, checked)
            }
          />
          <span className="text-sm text-muted-foreground">
            {isEnabled ? "启用" : "禁用"}
          </span>
        </div>
      )
    },
  },

  // 下次执行时间列
  {
    accessorKey: "next_run_time",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="下次执行" />
    ),
    cell: ({ row }) => {
      const nextRunTime = row.getValue("next_run_time") as string | undefined
      return (
        <div className="text-sm text-muted-foreground">
          {nextRunTime ? formatDate(nextRunTime) : "-"}
        </div>
      )
    },
  },

  // 执行次数列
  {
    accessorKey: "run_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="执行次数" />
    ),
    cell: ({ row }) => {
      const count = row.getValue("run_count") as number
      return (
        <div className="text-sm text-muted-foreground font-mono">{count}</div>
      )
    },
  },

  // 上次执行时间列
  {
    accessorKey: "last_run_time",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="上次执行" />
    ),
    cell: ({ row }) => {
      const lastRunTime = row.getValue("last_run_time") as string | undefined
      return (
        <div className="text-sm text-muted-foreground">
          {lastRunTime ? formatDate(lastRunTime) : "-"}
        </div>
      )
    },
  },

  // 操作列
  {
    id: "actions",
    cell: ({ row }) => (
      <ScheduledScanRowActions
        scan={row.original}
        onView={() => handleView(row.original)}
        onEdit={() => handleEdit(row.original)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
