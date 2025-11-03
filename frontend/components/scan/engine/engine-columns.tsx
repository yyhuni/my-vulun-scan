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
  MoreHorizontal,
  Trash2,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Check,
  Edit,
  X as XIcon,
} from "lucide-react"
import {
  IconTarget,
  IconBolt,
  IconSettings,
} from "@tabler/icons-react"
import type { ScanEngine, EngineType } from "@/types/engine.types"

/**
 * 引擎类型徽章组件
 */
function EngineTypeBadge({ type }: { type: EngineType }) {
  return (
    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">
      Default Engine
    </Badge>
  )
}

/**
 * 功能支持状态组件
 */
function FeatureStatus({ enabled }: { enabled?: boolean }) {
  if (enabled) {
    return (
      <div className="flex justify-center">
        <Check className="h-5 w-5 text-green-500" />
      </div>
    )
  }
  return (
    <div className="flex justify-center">
      <XIcon className="h-5 w-5 text-red-500" />
    </div>
  )
}

/**
 * 数据表格列头组件
 */
function DataTableColumnHeader({
  column,
  title,
}: {
  column: {
    getCanSort: () => boolean
    getIsSorted: () => false | "asc" | "desc"
    toggleSorting: (desc?: boolean) => void
  }
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

// 列创建函数的参数类型
interface CreateColumnsProps {
  formatDate: (dateString: string) => string
  handleEdit: (engine: ScanEngine) => void
  handleDelete: (engine: ScanEngine) => void
}

/**
 * 引擎行操作组件
 */
function EngineRowActions({
  engine,
  onEdit,
  onDelete,
}: {
  engine: ScanEngine
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
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Edit />
          编辑引擎
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

/**
 * 创建引擎表格列定义
 */
export const createEngineColumns = ({
  formatDate,
  handleEdit,
  handleDelete,
}: CreateColumnsProps): ColumnDef<ScanEngine>[] => [
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

  // 引擎名称列 - 可点击编辑
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="引擎名称" />
    ),
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      return (
        <button
          onClick={() => handleEdit(row.original)}
          className="max-w-[300px] truncate font-medium text-left hover:text-primary hover:underline cursor-pointer transition-colors"
        >
          {name}
        </button>
      )
    },
  },

  // 类型列
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="类型" />
    ),
    cell: ({ row }) => {
      const type = row.getValue("type") as EngineType
      return <EngineTypeBadge type={type} />
    },
  },

  // Subdomain Discovery
  {
    id: "subdomain_discovery",
    header: "Subdomain Discovery",
    cell: ({ row }) => <FeatureStatus enabled={row.original.subdomain_discovery} />,
    enableSorting: false,
  },

  // WAF Detection
  {
    id: "waf_detection",
    header: "WAF Detection",
    cell: ({ row }) => <FeatureStatus enabled={row.original.waf_detection} />,
    enableSorting: false,
  },

  // Screenshot
  {
    id: "screenshot",
    header: "Screenshot",
    cell: ({ row }) => <FeatureStatus enabled={row.original.screenshot} />,
    enableSorting: false,
  },

  // OSINT
  {
    id: "osint",
    header: "OSINT",
    cell: ({ row }) => <FeatureStatus enabled={row.original.osint} />,
    enableSorting: false,
  },

  // Port Scan
  {
    id: "port_scan",
    header: "Port Scan",
    cell: ({ row }) => <FeatureStatus enabled={row.original.port_scan} />,
    enableSorting: false,
  },

  // Directory & Files Discovery
  {
    id: "directory_files_discovery",
    header: "Directory & Files Discovery",
    cell: ({ row }) => (
      <FeatureStatus enabled={row.original.directory_files_discovery} />
    ),
    enableSorting: false,
  },

  // Fetch URLs
  {
    id: "fetch_urls",
    header: "Fetch URLs",
    cell: ({ row }) => <FeatureStatus enabled={row.original.fetch_urls} />,
    enableSorting: false,
  },

  // Vulnerability Scan
  {
    id: "vulnerability_scan",
    header: "Vulnerability Scan",
    cell: ({ row }) => (
      <FeatureStatus enabled={row.original.vulnerability_scan} />
    ),
    enableSorting: false,
  },

  // 操作列
  {
    id: "actions",
    cell: ({ row }) => (
      <EngineRowActions
        engine={row.original}
        onEdit={() => handleEdit(row.original)}
        onDelete={() => handleDelete(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
]

