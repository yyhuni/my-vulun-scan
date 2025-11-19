"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { MoreHorizontal, Trash2, ChevronsUpDown, ChevronUp, ChevronDown, Copy, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Subdomain } from "@/types/subdomain.types"
import { toast } from "sonner"

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
  handleDelete: (subdomain: Subdomain) => void
}

/**
 * 域名行操作组件
 */
function SubdomainRowActions({
  subdomain,
  onDelete,
}: {
  subdomain: Subdomain
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
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 />
          Delete
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
 * 创建目标域名表格列定义
 */
export const createSubdomainColumns = ({
  formatDate,
  navigate,
  handleDelete,
}: CreateColumnsProps): ColumnDef<Subdomain>[] => [
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

  // 子域名列
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subdomain" />
    ),
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      return <CopyableCell value={name} maxWidth="300px" truncateLength={40} successMessage="已复制子域名" />
    },
  },


  // IP地址列
  {
    accessorKey: "ipAddresses",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="IP 地址" />
    ),
    cell: ({ row }) => {
      const ipAddresses = row.getValue("ipAddresses") as string[] | undefined
      if (!ipAddresses || ipAddresses.length === 0) {
        return <span className="text-sm text-muted-foreground">-</span>
      }

      // 显示前5个IP，如果太多就显示省略
      const displayIPs = ipAddresses.slice(0, 5)
      const hasMore = ipAddresses.length > 5

      return (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {displayIPs.map((ip, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="text-xs font-mono"
            >
              {ip}
            </Badge>
          ))}
          {hasMore && (
            <Popover>
              <PopoverTrigger asChild>
                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                  +{ipAddresses.length - 5}
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">所有 IP 地址 ({ipAddresses.length})</h4>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {ipAddresses.map((ip, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="text-xs font-mono"
                      >
                        {ip}
                      </Badge>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )
    },
  },

  // 端口列
  {
    accessorKey: "ports",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="开放端口" />
    ),
    cell: ({ row }) => {
      const ports = row.getValue("ports") as Subdomain["ports"]
      if (!ports || ports.length === 0) {
        return <span className="text-sm text-muted-foreground">-</span>
      }

      // 常见端口颜色映射
      const getPortVariant = (portNumber: number) => {
        const commonPorts = [80, 443, 22, 21, 25, 53, 110, 143, 993, 995]
        const webPorts = [80, 443, 8080, 8443, 3000, 8000, 8888]
        const sshPorts = [22]
        
        if (sshPorts.includes(portNumber)) return "destructive"
        if (webPorts.includes(portNumber)) return "default"
        if (commonPorts.includes(portNumber)) return "secondary"
        return "outline"
      }

      // 按端口重要性排序：常见端口优先
      const sortedPorts = [...ports].sort((a, b) => {
        const commonPorts = [80, 443, 22, 21, 25, 53, 110, 143, 993, 995]
        const webPorts = [80, 443, 8080, 8443, 3000, 8000, 8888]
        
        const aScore = webPorts.includes(a.number) ? 3 : 
                      commonPorts.includes(a.number) ? 2 : 1
        const bScore = webPorts.includes(b.number) ? 3 : 
                      commonPorts.includes(b.number) ? 2 : 1
        
        if (aScore !== bScore) return bScore - aScore
        return a.number - b.number
      })

      // 显示前几个端口，如果太多就显示省略
      const displayPorts = sortedPorts.slice(0, 5)
      const hasMore = sortedPorts.length > 5

      return (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {displayPorts.map((port, index) => (
            <Badge 
              key={index} 
              variant={getPortVariant(port.number)}
              className="text-xs font-mono"
              title={`端口 ${port.number}${port.serviceName ? ` (${port.serviceName})` : ''}${port.description ? ` - ${port.description}` : ''}`}
            >
              {port.number}
            </Badge>
          ))}
          {hasMore && (
            <Popover>
              <PopoverTrigger asChild>
                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                  +{ports.length - 5}
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">所有开放端口 ({sortedPorts.length})</h4>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {sortedPorts.map((port, index) => (
                      <Badge 
                        key={index} 
                        variant={getPortVariant(port.number)}
                        className="text-xs font-mono"
                        title={`端口 ${port.number}${port.serviceName ? ` (${port.serviceName})` : ''}${port.description ? ` - ${port.description}` : ''}`}
                      >
                        {port.number}
                      </Badge>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )
    },
  },


  // 操作列
  {
    id: "actions",
    cell: ({ row }) => (
      <SubdomainRowActions
        subdomain={row.original}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]
