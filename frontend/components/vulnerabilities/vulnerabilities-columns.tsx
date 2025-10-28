"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import type { Vulnerability, VulnerabilitySeverity, VulnerabilityStatus } from "@/types/vulnerability.types"

const severityConfig: Record<VulnerabilitySeverity, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  critical: { label: "严重", variant: "destructive" },
  high: { label: "高危", variant: "destructive" },
  medium: { label: "中危", variant: "default" },
  low: { label: "低危", variant: "secondary" },
  info: { label: "信息", variant: "outline" },
}

const statusConfig: Record<VulnerabilityStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "开放", variant: "destructive" },
  in_progress: { label: "处理中", variant: "default" },
  resolved: { label: "已解决", variant: "secondary" },
  false_positive: { label: "误报", variant: "outline" },
  accepted: { label: "已接受", variant: "outline" },
}

interface ColumnActions {
  formatDate: (date: string) => string
  navigate: (path: string) => void
  handleDelete: (vulnerability: Vulnerability) => void
  handleViewDetail: (vulnerability: Vulnerability) => void
}

export function createVulnerabilityColumns({
  formatDate,
  navigate,
  handleDelete,
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
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => {
        const title = row.getValue("title") as string
        const cveId = row.original.cveId
        const vulnerability = row.original
        return (
          <div 
            className="space-y-1 cursor-pointer hover:text-primary transition-colors"
            onClick={() => handleViewDetail(vulnerability)}
          >
            <div className="font-medium">{title}</div>
            {cveId && (
              <div className="text-xs text-muted-foreground">
                {cveId}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as VulnerabilityStatus
        const config = statusConfig[status]
        return (
          <Badge variant={config.variant}>
            {config.label}
          </Badge>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">打开菜单</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>操作</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleViewDetail(vulnerability)}
                >
                  查看详情
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(vulnerability.title)}
                >
                  复制标题
                </DropdownMenuItem>
                {vulnerability.cveId && (
                  <DropdownMenuItem
                    onClick={() => navigator.clipboard.writeText(vulnerability.cveId!)}
                  >
                    复制 CVE ID
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(vulnerability)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除漏洞
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]
}
