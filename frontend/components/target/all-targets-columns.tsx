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
import { MoreHorizontal, Eye, Trash2, ChevronsUpDown, ChevronUp, ChevronDown, Copy, Check, Play, Calendar, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { Target } from "@/types/target.types"

/**
 * 可复制单元格组件
 */
function CopyableCell({ 
  value, 
  maxWidth = "400px", 
  truncateLength = 50,
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
                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
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

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string
  navigate: (path: string) => void
  handleDelete: (target: Target) => void
  handleInitiateScan: (target: Target) => void
  handleScheduleScan: (target: Target) => void
  handleEdit: (target: Target) => void
}

/**
 * 目标行操作组件
 */
function TargetRowActions({
  target,
  onView,
  onInitiateScan,
  onScheduleScan,
  onEdit,
  onDelete,
}: {
  target: Target
  onView: () => void
  onInitiateScan: () => void
  onScheduleScan: () => void
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
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onView}>
          <Eye />
          Target Summary
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onInitiateScan}>
          <Play />
          Initiate Scan
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onScheduleScan}>
          <Calendar />
          Schedule Scan
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          Edit Target
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 />
          Delete Target
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
 * 创建所有目标表格列定义
 */
export const createAllTargetsColumns = ({
  formatDate,
  navigate,
  handleDelete,
  handleInitiateScan,
  handleScheduleScan,
  handleEdit,
}: CreateColumnsProps): ColumnDef<Target>[] => [
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

  // 目标名称列
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Target" />
    ),
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      const targetId = row.original.id
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/target/${targetId}/details`)}
            className="text-sm font-medium text-primary hover:underline cursor-pointer truncate max-w-[350px]"
            title={name}
          >
            {name}
          </button>
        </div>
      )
    },
  },

  // 所属组织列
  {
    accessorKey: "organizations",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Organization" />
    ),
    cell: ({ row }) => {
      const organizations = row.getValue("organizations") as Array<{ id: number; name: string }> | undefined
      if (!organizations || organizations.length === 0) {
        return <span className="text-sm text-muted-foreground">-</span>
      }
      
      const displayOrgs = organizations.slice(0, 2)
      const remainingCount = organizations.length - 2
      
      return (
        <div className="flex flex-wrap gap-1">
          {displayOrgs.map((org) => (
            <Badge 
              key={org.id} 
              variant="secondary" 
              className="text-xs"
              title={org.name}
            >
              {org.name}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <TooltipProvider delayDuration={500} skipDelayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="text-xs cursor-default"
                  >
                    +{remainingCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent 
                  side="top" 
                  align="start"
                  sideOffset={5}
                  className="max-w-sm"
                >
                  <div className="flex flex-col gap-1">
                    {organizations.slice(2).map((org) => (
                      <div key={org.id} className="text-xs">
                        {org.name}
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )
    },
    enableSorting: false,
  },

  // 描述列
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => {
      const description = row.getValue("description") as string | undefined
      if (!description) {
        return <span className="text-sm text-muted-foreground">-</span>
      }
      return <CopyableCell value={description} maxWidth="300px" truncateLength={40} successMessage="已复制描述" className="text-sm text-muted-foreground" />
    },
  },

  // 创建时间列
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Added On" />
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

  // 最后扫描时间列
  {
    accessorKey: "lastScannedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Scanned" />
    ),
    cell: ({ row }) => {
      const lastScannedAt = row.original.lastScannedAt
      if (!lastScannedAt) {
        return <span className="text-sm text-muted-foreground">-</span>
      }
      return (
        <div className="text-sm text-muted-foreground">
          {formatDate(lastScannedAt)}
        </div>
      )
    },
  },

  // 操作列
  {
    id: "actions",
    cell: ({ row }) => (
      <TargetRowActions
        target={row.original}
        onView={() => navigate(`/target/${row.original.id}/details`)}
        onInitiateScan={() => handleInitiateScan(row.original)}
        onScheduleScan={() => handleScheduleScan(row.original)}
        onEdit={() => handleEdit(row.original)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
