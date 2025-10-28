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
import { MoreHorizontal, Eye, Trash2, Network, ChevronsUpDown, ChevronUp, ChevronDown, Globe, Code, Copy, Check } from "lucide-react"
import { IconCircleCheckFilled, IconLoader, IconAlertTriangle, IconX } from "@tabler/icons-react"
import type { Endpoint } from "@/types/endpoint.types"
import { toast } from "sonner"

function CopyableCell({ 
  value, 
  maxWidth = "500px", 
  truncateLength = 60,
  successMessage = "已复制",
  className = "font-mono"
}: { 
  value: string | undefined | null
  maxWidth?: string
  truncateLength?: number
  successMessage?: string
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)
  
  if (!value) {
    return <span className="text-muted-foreground text-sm">-</span>
  }
  
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
            className={`text-xs ${className} ${isLong ? 'max-w-[500px] break-all' : 'whitespace-nowrap'}`}
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

interface CreateColumnsProps {
  formatDate: (dateString: string) => string
  navigate: (path: string) => void
  handleDelete: (endpoint: Endpoint) => void
}

function EndpointRowActions({
  endpoint,
  onView,
  onDelete,
}: {
  endpoint: Endpoint
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

function HttpStatusBadge({ statusCode }: { statusCode: number | null | undefined }) {
  if (statusCode === null || statusCode === undefined) {
    return (
      <Badge variant="outline" className="text-muted-foreground px-2 py-1 font-mono">
        -
      </Badge>
    )
  }

  const getStatusVariant = (code: number): "default" | "secondary" | "destructive" | "outline" => {
    if (code >= 200 && code < 300) {
      return "outline"
    } else if (code >= 300 && code < 400) {
      return "secondary"
    } else if (code >= 400 && code < 500) {
      return "default"
    } else if (code >= 500) {
      return "destructive"
    } else {
      return "secondary"
    }
  }

  const variant = getStatusVariant(statusCode)

  return (
    <Badge variant={variant} className="px-2 py-1 font-mono tabular-nums">
      {statusCode}
    </Badge>
  )
}

export const createEndpointColumns = ({
  formatDate,
  navigate,
  handleDelete,
}: CreateColumnsProps): ColumnDef<Endpoint>[] => [
  {
    accessorKey: "url",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="HTTP URL" />
    ),
    cell: ({ row }) => {
      const url = row.getValue("url") as string
      return <CopyableCell value={url} maxWidth="800px" truncateLength={100} successMessage="已复制 URL" />
    },
  },
]
