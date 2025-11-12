"use client"

import * as React from "react"
import { Column, ColumnDef } from "@tanstack/react-table"
import { CaretSortIcon } from "@radix-ui/react-icons"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { IPAddress } from "@/types/ip-address.types"
import { toast } from "sonner"

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
}

function DataTableColumnHeader<TData, TValue>({
  column,
  title,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column?.getCanSort()) {
    return <div className="text-left font-medium">{title}</div>
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 p-0"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span>{title}</span>
        <CaretSortIcon className="ml-2 h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <span className="sr-only">列操作</span>
            ...
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            升序
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            降序
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.clearSorting()}>
            取消排序
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function createIPAddressColumns(params: {
  formatDate: (value: string) => string
}) {
  const { formatDate } = params

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`已复制 IP 地址：${value}`)
    } catch (error) {
      toast.error("复制失败，请稍后再试")
      console.error("复制 IP 失败：", error)
    }
  }

  const columns: ColumnDef<IPAddress>[] = [
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
    {
      accessorKey: "ip",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="IP 地址" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-mono text-sm">
          <span>{row.original.ip}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCopy(row.original.ip)}
            title="复制 IP 地址"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: "subdomain",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="所属子域名" />
      ),
      cell: ({ getValue }) => {
        const value = getValue<string | undefined>()
        return value ? (
          <span className="font-medium">{value}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="发现时间" />
      ),
      cell: ({ getValue }) => {
        const value = getValue<string | undefined>()
        return value ? formatDate(value) : "-"
      },
    },
    {
      accessorKey: "ports",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="开放端口" />
      ),
      cell: ({ getValue }) => {
        const ports = getValue<IPAddress["ports"]>()
        if (!ports || ports.length === 0) {
          return <span className="text-muted-foreground">-</span>
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
    {
      accessorKey: "reversePointer",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="反向解析" />
      ),
      cell: ({ getValue }) => {
        const value = getValue<string | undefined>()
        return value ? (
          <span className="font-mono text-sm">{value}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      },
    },
  ]

  return columns
}
