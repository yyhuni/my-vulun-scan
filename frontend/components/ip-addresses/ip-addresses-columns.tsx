"use client"

import * as React from "react"
import { Column, ColumnDef } from "@tanstack/react-table"
import { CaretSortIcon } from "@radix-ui/react-icons"
import { Copy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

const riskLabelMap: Record<IPAddress["riskLevel"], string> = {
  high: "高",
  medium: "中",
  low: "低",
}

const riskVariantMap: Record<IPAddress["riskLevel"], "destructive" | "default" | "secondary"> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
}

export function createIPAddressColumns(params: {
  formatDate: (value: string) => string
}) {
  const { formatDate } = params

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`已复制 IP：${value}`)
    } catch (error) {
      toast.error("复制失败，请稍后再试")
      console.error("复制 IP 失败：", error)
    }
  }

  const columns: ColumnDef<IPAddress>[] = [
    {
      accessorKey: "ip",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="IP 地址" />
      ),
      cell: ({ row }) => {
        const value = row.original
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 font-mono text-sm">
              <span>{value.ip}</span>
              <Badge variant="outline">{value.protocolVersion}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {value.reversePointer || "暂无反向解析"}
            </p>
          </div>
        )
      },
    },
    {
      accessorKey: "subdomain",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="子域名" />
      ),
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "ports",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="开放端口" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {row.original.ports.map((port) => (
            <Badge key={`${row.original.id}-${port.port}`} variant="secondary">
              {port.port}/{port.service}
            </Badge>
          ))}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "isPrivate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="网络类型" />
      ),
      cell: ({ getValue }) => {
        const value = getValue<boolean>()
        return (
          <Badge variant={value ? "secondary" : "default"}>
            {value ? "私网" : "公网"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "riskLevel",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="风险等级" />
      ),
      cell: ({ getValue }) => {
        const value = getValue<IPAddress["riskLevel"]>()
        return (
          <Badge variant={riskVariantMap[value]}>
            {riskLabelMap[value]}
          </Badge>
        )
      },
    },
    {
      accessorKey: "lastSeen",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="最近发现" />
      ),
      cell: ({ getValue }) => (
        <span>{formatDate(getValue<string>())}</span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: "操作",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleCopy(row.original.ip)}
          title="复制 IP"
        >
          <Copy className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return columns
}
