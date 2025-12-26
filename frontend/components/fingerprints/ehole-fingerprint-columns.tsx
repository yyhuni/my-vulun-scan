"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import type { EholeFingerprint } from "@/types/fingerprint.types"

interface ColumnOptions {
  formatDate: (date: string) => string
}

/**
 * 创建 EHole 指纹表格列定义
 */
export function createEholeFingerprintColumns({
  formatDate,
}: ColumnOptions): ColumnDef<EholeFingerprint>[] {
  return [
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
      size: 40,
    },
    // CMS 名称
    {
      accessorKey: "cms",
      header: "CMS",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("cms")}</div>
      ),
      size: 200,
    },
    // 匹配方式
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => {
        const method = row.getValue("method") as string
        return (
          <Badge variant="outline" className="font-mono text-xs">
            {method}
          </Badge>
        )
      },
      size: 100,
    },
    // 匹配位置
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => {
        const location = row.getValue("location") as string
        return (
          <Badge variant="secondary" className="font-mono text-xs">
            {location}
          </Badge>
        )
      },
      size: 100,
    },
    // 关键词
    {
      accessorKey: "keyword",
      header: "Keyword",
      cell: ({ row }) => {
        const keywords = row.getValue("keyword") as string[]
        if (!keywords || keywords.length === 0) return "-"
        return (
          <div className="font-mono text-xs text-muted-foreground space-y-0.5">
            {keywords.map((kw, idx) => (
              <div key={idx}>{kw}</div>
            ))}
          </div>
        )
      },
      size: 300,
    },
    // 类型
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        if (!type || type === "-") return "-"
        return <Badge variant="outline">{type}</Badge>
      },
      size: 100,
    },
    // 重点资产
    {
      accessorKey: "isImportant",
      header: "Important",
      cell: ({ row }) => {
        const isImportant = row.getValue("isImportant") as boolean
        return isImportant ? (
          <Badge variant="destructive">重点</Badge>
        ) : null
      },
      size: 80,
    },
    // 创建时间
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string
        return (
          <div className="text-sm text-muted-foreground">
            {formatDate(date)}
          </div>
        )
      },
      size: 160,
    },
  ]
}
