"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ScanRecord, ScanStatus } from "@/types/scan.types"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  MoreHorizontal, 
  Eye, 
  Trash2, 
  ChevronsUpDown, 
  ChevronUp, 
  ChevronDown,
  Copy,
  Check,
  CircleArrowRight,
  StopCircle,
} from "lucide-react"
import {
  IconClock,
  IconCircleCheck,
  IconCircleX,
  IconLoader,
} from "@tabler/icons-react"
import { toast } from "sonner"

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
                <Check className="h-3.5 w-3.5 text-chart-4" />
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
 * 使用 shadcn Badge 的标准 variant
 * Running/Initiated 状态可点击查看进度详情
 */
function StatusBadge({ 
  status, 
  onClick 
}: { 
  status: ScanStatus
  onClick?: () => void 
}) {
  const config: Record<ScanStatus, {
    icon: React.ComponentType<{ className?: string }>
    label: string
    variant: "secondary" | "default" | "outline" | "destructive"
    className?: string
  }> = {
    cancelled: {
      icon: IconCircleX,
      label: "Cancelled",
      variant: "outline",
      className: "bg-chart-2/20 text-chart-2 border-chart-2/30 hover:bg-chart-2/30 transition-colors",
    },
    cancelling: {
      icon: StopCircle,
      label: "Cancelling",
      variant: "outline",
      className: "bg-orange-500/20 text-orange-500 border-orange-500/30 hover:bg-orange-500/30 transition-colors",
    },
    completed: {
      icon: IconCircleCheck,
      label: "Completed",
      variant: "outline",
      className: "bg-chart-1/20 text-chart-1 border-chart-1/30 hover:bg-chart-1/30 transition-colors",
    },
    crashed: {
      icon: IconCircleX,
      label: "Crashed",
      variant: "destructive",
      className: "bg-purple-500/20 text-purple-500 border-purple-500/30 hover:bg-purple-500/30 transition-colors",
    },
    failed: {
      icon: IconCircleX,
      label: "Failed",
      variant: "outline",
      className: "bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30 transition-colors",
    },
    initiated: {
      icon: IconClock,
      label: "Initiated",
      variant: "outline",
      className: "bg-chart-4/20 text-chart-4 border-chart-4/30 hover:bg-chart-4/30 transition-colors",
    },
    running: {
      icon: IconLoader,
      label: "Running",
      variant: "outline",
      className: "bg-chart-3/20 text-chart-3 border-chart-3/30 hover:bg-chart-3/30 transition-colors",
    },
  }

  const { icon: Icon, label, variant, className } = config[status]

  const badge = (
    <Badge variant={variant} className={className}>
      <Icon className={`h-3.5 w-3.5 ${status === "running" ? "animate-spin" : ""}`} />
      {label}
      {onClick && <span className="ml-0.5 text-xs opacity-60">›</span>}
    </Badge>
  )

  if (onClick) {
    return (
      <button 
        onClick={onClick}
        className="cursor-pointer hover:scale-105 transition-transform"
        title="点击查看进度详情"
      >
        {badge}
      </button>
    )
  }

  return badge
}

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string
  navigate: (path: string) => void
  handleDelete: (scan: ScanRecord) => void
  handleStop: (scan: ScanRecord) => void
  handleViewProgress?: (scan: ScanRecord) => void
}

/**
 * 扫描记录行操作组件
 */
function ScanRowActions({
  scan,
  onView,
  onDelete,
  onStop,
}: {
  scan: ScanRecord
  onView: () => void
  onDelete: () => void
  onStop: () => void
}) {
  // 只有在运行中或初始化状态时才显示停止选项（cancelling 状态下不允许再次停止）
  const canStop = scan.status === 'running' || scan.status === 'initiated'

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
          View Results
        </DropdownMenuItem>
        {canStop && (
          <DropdownMenuItem
            onClick={onStop}
            className="text-chart-2 focus:text-chart-2"
          >
            <StopCircle />
            Stop Scan
          </DropdownMenuItem>
        )}
        {canStop && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 />
          delete
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
  handleStop,
  handleViewProgress,
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

  // Target 列
  {
    accessorKey: "targetName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Target" />
    ),
    cell: ({ row }) => {
      const targetName = row.getValue("targetName") as string
      const targetId = row.original.target
      
      const maxLength = 30
      const isLong = targetName.length > maxLength
      const displayText = isLong ? targetName.substring(0, maxLength) : targetName
      
      return (
        <div className="group inline-flex items-center gap-1 max-w-[250px]">
          <div className="flex items-center gap-1">
            {targetId ? (
              <button
                onClick={() => navigate(`/target/${targetId}/details`)}
                className="text-sm font-medium hover:text-primary hover:underline transition-colors cursor-pointer"
              >
                {displayText}
              </button>
            ) : (
              <span className="text-sm font-medium">
                {displayText}
              </span>
            )}
            {isLong && (
              <Popover>
                <PopoverTrigger asChild>
                  <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted flex-shrink-0">
                    ...
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-3">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">完整目标名称</h4>
                    <div className="text-sm break-all bg-muted p-2 rounded max-h-32 overflow-y-auto">
                      {targetName}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          {targetId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0 hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/target/${targetId}/details`)
              }}
            >
              <CircleArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      )
    },
  },

  // Summary 列
  {
    accessorKey: "summary",
    header: "Summary",
    cell: ({ row }) => {
      const summary = row.getValue("summary") as { 
        subdomains: number
        websites: number
        endpoints: number
        ips: number
        vulnerabilities: {
          total: number
          critical: number
          high: number
          medium: number
          low: number
        }
      }
      return (
        <div className="flex items-center gap-1.5">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline"
                  className="bg-chart-4/20 text-chart-4 border-chart-4/30 hover:bg-chart-4/30 transition-colors"
                >
                  {summary.subdomains}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Subdomains</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline"
                  className="bg-chart-2/20 text-chart-2 border-chart-2/30 hover:bg-chart-2/30 transition-colors"
                >
                  {summary.websites}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Websites</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline"
                  className="bg-chart-5/20 text-chart-5 border-chart-5/30 hover:bg-chart-5/30 transition-colors"
                >
                  {summary.ips}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">IP Addresses</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline"
                  className="bg-chart-1/20 text-chart-1 border-chart-1/30 hover:bg-chart-1/30 transition-colors"
                >
                  {summary.endpoints}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Endpoints</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline"
                  className={
                    summary.vulnerabilities.total > 0 
                      ? "bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30 transition-colors"
                      : "bg-muted text-muted-foreground border-muted hover:bg-muted/80 transition-colors"
                  }
                >
                  {summary.vulnerabilities.total}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs font-medium">
                  {summary.vulnerabilities.critical} Critical, {summary.vulnerabilities.high} High, {summary.vulnerabilities.medium} Medium Vulnerabilities
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    },
    enableSorting: false,
  },

  // Engine Name 列
  {
    accessorKey: "engineName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Engine Name" />
    ),
    cell: ({ row }) => {
      const engineName = row.getValue("engineName") as string
      return (
        <Badge variant="secondary">
          {engineName}
        </Badge>
      )
    },
  },

  // Created At 列
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ row }) => {
      const createdAt = row.getValue("createdAt") as string
      return (
        <div className="text-sm text-muted-foreground">
          {formatDate(createdAt)}
        </div>
      )
    },
  },

  // Status 列
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as ScanStatus
      return (
        <StatusBadge 
          status={status} 
          onClick={handleViewProgress ? () => handleViewProgress(row.original) : undefined}
        />
      )
    },
  },

  // Progress 列
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const progress = row.getValue("progress") as number
      const status = row.original.status
      const currentStage = row.original.currentStage
      
      // 如果状态是completed，显示100%
      const displayProgress = status === "completed" ? 100 : progress
      
      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                status === "completed" ? "bg-chart-1" : 
                status === "failed" ? "bg-destructive" : 
                status === "running" ? "bg-chart-3" : 
                status === "cancelled" ? "bg-chart-2" :
                status === "cancelling" ? "bg-orange-500" :
                status === "crashed" ? "bg-purple-500" :
                status === "initiated" ? "bg-chart-4" :
                "bg-muted-foreground"
              }`}
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono w-10">
            {displayProgress}%
          </span>
        </div>
      )
    },
    enableSorting: false,
  },

  // 操作列
  {
    id: "actions",
    cell: ({ row }) => {
      const scan = row.original
      const canStop = scan.status === 'running' || scan.status === 'initiated'
      
      return (
        <div className="flex items-center gap-1">
          {/* View Results 按钮 - 直接显示 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => navigate(`/scan/history/${scan.id}/`)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            查看
          </Button>
          
          {/* 更多操作菜单 */}
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
            <DropdownMenuContent align="end">
              {canStop && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleStop(scan)}
                    className="text-chart-2 focus:text-chart-2"
                  >
                    <StopCircle />
                    停止扫描
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => handleDelete(scan)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
]
