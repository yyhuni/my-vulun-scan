"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Eye } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Vulnerability, VulnerabilitySeverity } from "@/types/vulnerability.types"

const severityConfig: Record<VulnerabilitySeverity, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  critical: { label: "严重", variant: "destructive" },
  high: { label: "高危", variant: "destructive" },
  medium: { label: "中危", variant: "default" },
  low: { label: "低危", variant: "secondary" },
  info: { label: "信息", variant: "outline" },
}

interface ColumnActions {
  formatDate: (date: string) => string
  handleViewDetail: (vulnerability: Vulnerability) => void
}

export function createVulnerabilityColumns({
  formatDate,
  handleViewDetail,
}: ColumnActions): ColumnDef<Vulnerability>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="全选"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="选择行"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "severity",
      header: "Status",
      cell: ({ row }) => {
        const severity = row.getValue("severity") as VulnerabilitySeverity
        const config = severityConfig[severity]
        return (
          <Badge variant={config.variant}>
            {config.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => {
        const source = row.getValue("source") as string
        return (
          <Badge variant="outline">
            {source}
          </Badge>
        )
      },
    },
    {
      accessorKey: "vulnType",
      header: "类型",
      cell: ({ row }) => {
        const vulnType = row.getValue("vulnType") as string
        const vulnerability = row.original
        return (
          <div 
            className="space-y-1 cursor-pointer hover:text-primary transition-colors"
            onClick={() => handleViewDetail(vulnerability)}
          >
            <div className="font-medium">{vulnType}</div>
          </div>
        )
      },
    },
    {
      accessorKey: "url",
      header: "URL",
      cell: ({ row }) => {
        const url = row.original.url
        if (!url) return <span className="text-muted-foreground">-</span>
        
        // 截断过长的 URL
        const maxLength = 50
        const displayUrl = url.length > maxLength 
          ? url.substring(0, maxLength) + "..." 
          : url
        
        return (
          <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline break-all"
            title={url}
            onClick={(e) => e.stopPropagation()}
          >
            {displayUrl}
          </a>
        )
      },
    },
    {
      accessorKey: "discoveredAt",
      header: "发现时间",
      cell: ({ row }) => {
        const discoveredAt = row.getValue("discoveredAt") as string
        return (
          <span className="text-sm text-muted-foreground">
            {formatDate(discoveredAt)}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const vulnerability = row.original

        return (
          <div className="text-right">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => handleViewDetail(vulnerability)}
            >
              <Eye className="h-4 w-4 mr-1" />
              详情
            </Button>
          </div>
        )
      },
    },
  ]
}
