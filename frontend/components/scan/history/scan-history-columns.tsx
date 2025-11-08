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
 */
function StatusBadge({ status }: { status: ScanStatus }) {
  const config: Record<ScanStatus, {
    icon: React.ComponentType<{ className?: string }>
    label: string
    variant: "secondary" | "default" | "outline" | "destructive"
    className?: string
  }> = {
    aborted: {
      icon: IconCircleX,
      label: "Aborted",
      variant: "outline",
      className: "bg-chart-2/20 text-chart-2 border-chart-2/30 hover:bg-chart-2/30 transition-colors",
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
    successful: {
      icon: IconCircleCheck,
      label: "Successful",
      variant: "outline",
      className: "bg-chart-1/20 text-chart-1 border-chart-1/30 hover:bg-chart-1/30 transition-colors",
    },
  }

  const { icon: Icon, label, variant, className } = config[status]

  return (
    <Badge variant={variant} className={className}>
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
          View Results
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 />
          Delete Scan Results
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

  // Target Name 列
  {
    accessorKey: "targetName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Target Name" />
    ),
    cell: ({ row }) => {
      const targetName = row.getValue("targetName") as string
      return <CopyableCell value={targetName} maxWidth="250px" truncateLength={35} successMessage="已复制目标名称" />
    },
  },

  // Summary 列
  {
    accessorKey: "summary",
    header: "Summary",
    cell: ({ row }) => {
      const summary = row.getValue("summary") as { 
        subdomains: number
        endpoints: number
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

  // Started At 列
  {
    accessorKey: "startedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Started At" />
    ),
    cell: ({ row }) => {
      const startedAt = row.getValue("startedAt") as string | null
      return (
        <div className="text-sm text-muted-foreground">
          {startedAt ? formatDate(startedAt) : '-'}
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
      return <StatusBadge status={status} />
    },
  },

  // Progress 列
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const progress = row.getValue("progress") as number
      const status = row.original.status
      
      // 如果状态是successful，显示100%
      const displayProgress = status === "successful" ? 100 : progress
      
      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                status === "successful" ? "bg-chart-1" : 
                status === "failed" ? "bg-destructive" : 
                status === "running" ? "bg-chart-3" : 
                status === "aborted" ? "bg-chart-2" :
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
    cell: ({ row }) => (
      <ScanRowActions
        scan={row.original}
        onView={() => navigate(`/scan/history/${row.original.id}/`)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
