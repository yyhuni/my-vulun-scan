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
  StopCircle,
} from "lucide-react"
import { DataTableColumnHeader } from "@/components/ui/data-table/column-header"
import {
  IconClock,
  IconCircleCheck,
  IconCircleX,
  IconLoader,
  IconWorld,
  IconBrowser,
  IconServer,
  IconLink,
  IconBug,
} from "@tabler/icons-react"

// Translation type definitions
export interface ScanHistoryTranslations {
  columns: {
    target: string
    summary: string
    engineName: string
    workerName: string
    createdAt: string
    status: string
    progress: string
  }
  actions: {
    snapshot: string
    stopScan: string
    delete: string
    openMenu: string
    selectAll: string
    selectRow: string
  }
  tooltips: {
    targetDetails: string
    viewProgress: string
  }
  status: {
    cancelled: string
    completed: string
    failed: string
    initiated: string
    running: string
  }
  summary: {
    subdomains: string
    websites: string
    ipAddresses: string
    endpoints: string
    vulnerabilities: string
  }
}

/**
 * Status badge component
 */
function StatusBadge({ 
  status, 
  onClick,
  labels,
}: { 
  status: ScanStatus
  onClick?: () => void
  labels: Record<ScanStatus, string>
}) {
  const config: Record<ScanStatus, {
    icon: React.ComponentType<{ className?: string }>
    variant: "secondary" | "default" | "outline" | "destructive"
    className?: string
  }> = {
    cancelled: {
      icon: IconCircleX,
      variant: "outline",
      className: "bg-[#848d97]/10 text-[#848d97] border-[#848d97]/20 hover:bg-[#848d97]/20 transition-colors",
    },
    completed: {
      icon: IconCircleCheck,
      variant: "outline",
      className: "bg-[#238636]/10 text-[#238636] border-[#238636]/20 hover:bg-[#238636]/20 dark:text-[#3fb950] transition-colors",
    },
    failed: {
      icon: IconCircleX,
      variant: "outline",
      className: "bg-[#da3633]/10 text-[#da3633] border-[#da3633]/20 hover:bg-[#da3633]/20 dark:text-[#f85149] transition-colors",
    },
    initiated: {
      icon: IconClock,
      variant: "outline",
      className: "bg-[#d29922]/10 text-[#d29922] border-[#d29922]/20 hover:bg-[#d29922]/20 transition-colors",
    },
    running: {
      icon: IconLoader,
      variant: "outline",
      className: "bg-[#d29922]/10 text-[#d29922] border-[#d29922]/20 hover:bg-[#d29922]/20 transition-colors",
    },
  }

  const { icon: Icon, variant, className } = config[status]
  const label = labels[status]

  const badge = (
    <Badge variant={variant} className={className}>
      {(status === "running" || status === "initiated") ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {label}
      {onClick && <span className="ml-0.5 text-xs opacity-60">›</span>}
    </Badge>
  )

  if (onClick) {
    return (
      <button 
        onClick={onClick}
        className="cursor-pointer hover:scale-105 transition-transform"
      >
        {badge}
      </button>
    )
  }

  return badge
}

// Column creation function parameter types
interface CreateColumnsProps {
  formatDate: (dateString: string) => string
  navigate: (path: string) => void
  handleDelete: (scan: ScanRecord) => void
  handleStop: (scan: ScanRecord) => void
  handleViewProgress?: (scan: ScanRecord) => void
  t: ScanHistoryTranslations
  hideTargetColumn?: boolean
}

/**
 * Create scan history table column definitions
 */
export const createScanHistoryColumns = ({
  formatDate,
  navigate,
  handleDelete,
  handleStop,
  handleViewProgress,
  t,
  hideTargetColumn = false,
}: CreateColumnsProps): ColumnDef<ScanRecord>[] => {
  const columns: ColumnDef<ScanRecord>[] = [
  {
    id: "select",
    size: 40,
    minSize: 40,
    maxSize: 40,
    enableResizing: false,
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label={t.actions.selectAll}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={t.actions.selectRow}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "targetName",
    size: 350,
    minSize: 100,
    meta: { title: t.columns.target },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t.columns.target} />
    ),
    cell: ({ row }) => {
      const targetName = row.getValue("targetName") as string
      const targetId = row.original.target
      
      return (
        <div className="flex-1 min-w-0">
          {targetId ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate(`/target/${targetId}/details`)}
                  className="text-sm font-medium hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer text-left break-all leading-relaxed whitespace-normal"
                >
                  {targetName}
                </button>
              </TooltipTrigger>
              <TooltipContent>{t.tooltips.targetDetails}</TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-sm font-medium break-all leading-relaxed whitespace-normal">
              {targetName}
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "summary",
    meta: { title: t.columns.summary },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t.columns.summary} />
    ),
    size: 290,
    minSize: 150,
    cell: ({ row }) => {
      const summary = (row.getValue("summary") as {
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
      }) || {}

      const subdomains = summary?.subdomains ?? 0
      const websites = summary?.websites ?? 0
      const endpoints = summary?.endpoints ?? 0
      const ips = summary?.ips ?? 0
      const vulns = summary?.vulnerabilities?.total ?? 0

      const badges: React.ReactNode[] = []

      if (subdomains > 0) {
        badges.push(
          <TooltipProvider delayDuration={300} key="subdomains">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline"
                  className="bg-blue-500/15 text-blue-600 border-blue-500/30 hover:bg-blue-500/25 dark:text-blue-400 transition-colors gap-1"
                >
                  <IconWorld className="h-3 w-3" />
                  {subdomains}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{t.summary.subdomains}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      }

      if (websites > 0) {
        badges.push(
          <TooltipProvider delayDuration={300} key="websites">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline"
                  className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/25 dark:text-emerald-400 transition-colors gap-1"
                >
                  <IconBrowser className="h-3 w-3" />
                  {websites}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{t.summary.websites}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      }

      if (ips > 0) {
        badges.push(
          <TooltipProvider delayDuration={300} key="ips">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline"
                  className="bg-orange-500/15 text-orange-600 border-orange-500/30 hover:bg-orange-500/25 dark:text-orange-400 transition-colors gap-1"
                >
                  <IconServer className="h-3 w-3" />
                  {ips}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{t.summary.ipAddresses}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      }

      if (endpoints > 0) {
        badges.push(
          <TooltipProvider delayDuration={300} key="endpoints">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline"
                  className="bg-violet-500/15 text-violet-600 border-violet-500/30 hover:bg-violet-500/25 dark:text-violet-400 transition-colors gap-1"
                >
                  <IconLink className="h-3 w-3" />
                  {endpoints}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{t.summary.endpoints}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      }

      if (vulns > 0) {
        badges.push(
          <TooltipProvider delayDuration={300} key="vulnerabilities">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline"
                  className="gap-1 bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/25 dark:text-red-400 transition-colors"
                >
                  <IconBug className="h-3 w-3" />
                  {vulns}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs font-medium">
                  {summary?.vulnerabilities?.critical ?? 0} Critical, {summary?.vulnerabilities?.high ?? 0} High, {summary?.vulnerabilities?.medium ?? 0} Medium {t.summary.vulnerabilities}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      }

      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {badges.length > 0 ? (
            badges
          ) : (
            <Badge
              variant="outline"
              className="gap-0 bg-muted/70 text-muted-foreground/80 border-border/40 px-1.5 py-0.5 rounded-full justify-center"
            >
              <span className="text-[11px] font-medium leading-none">-</span>
              <span className="sr-only">No summary</span>
            </Badge>
          )}
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: "engineNames",
    size: 150,
    minSize: 100,
    maxSize: 200,
    enableResizing: false,
    meta: { title: t.columns.engineName },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t.columns.engineName} />
    ),
    cell: ({ row }) => {
      const engineNames = row.getValue("engineNames") as string[] | undefined
      if (!engineNames || engineNames.length === 0) {
        return <span className="text-muted-foreground text-sm">-</span>
      }
      return (
        <div className="flex flex-wrap gap-1">
          {engineNames.map((name, index) => (
            <Badge key={index} variant="secondary">
              {name}
            </Badge>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: "workerName",
    size: 120,
    minSize: 80,
    maxSize: 180,
    enableResizing: false,
    meta: { title: t.columns.workerName },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t.columns.workerName} />
    ),
    cell: ({ row }) => {
      const workerName = row.getValue("workerName") as string | null | undefined
      return (
        <Badge variant="outline">
          {workerName || "-"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "createdAt",
    size: 150,
    minSize: 120,
    maxSize: 200,
    enableResizing: false,
    meta: { title: t.columns.createdAt },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t.columns.createdAt} />
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
  {
    accessorKey: "status",
    size: 110,
    minSize: 90,
    maxSize: 130,
    enableResizing: false,
    meta: { title: t.columns.status },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t.columns.status} />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as ScanStatus
      return (
        <StatusBadge 
          status={status} 
          onClick={handleViewProgress ? () => handleViewProgress(row.original) : undefined}
          labels={t.status}
        />
      )
    },
  },
  {
    accessorKey: "progress",
    meta: { title: t.columns.progress },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={t.columns.progress} />
    ),
    size: 150,
    minSize: 120,
    maxSize: 200,
    cell: ({ row }) => {
      const progress = row.getValue("progress") as number
      const status = row.original.status
      const displayProgress = status === "completed" ? 100 : progress
      
      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-2 bg-primary/10 rounded-full overflow-hidden border border-border">
            <div 
              className={`h-full transition-all ${
                status === "completed" ? "bg-[#238636]" : 
                status === "failed" ? "bg-[#da3633]" : 
                status === "running" ? "bg-[#d29922] progress-striped" : 
                status === "cancelled" ? "bg-[#848d97]" :
                status === "initiated" ? "bg-[#d29922] progress-striped" :
                "bg-muted-foreground/80"
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
  {
    id: "actions",
    size: 120,
    minSize: 100,
    maxSize: 150,
    enableResizing: false,
    cell: ({ row }) => {
      const scan = row.original
      const canStop = scan.status === 'running' || scan.status === 'initiated'
      
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => navigate(`/scan/history/${scan.id}/`)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            {t.actions.snapshot}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">{t.actions.openMenu}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canStop && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleStop(scan)}
                    className="text-primary focus:text-primary"
                  >
                    <StopCircle />
                    {t.actions.stopScan}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => handleDelete(scan)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 />
                {t.actions.delete}
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

  // Filter out targetName column if hideTargetColumn is true
  if (hideTargetColumn) {
    return columns.filter(col => (col as any).accessorKey !== 'targetName')
  }

  return columns
}
