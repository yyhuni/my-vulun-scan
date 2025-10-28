"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ScheduledScanDataTable } from "@/components/scan/scheduled/scheduled-scan-data-table"
import { createScheduledScanColumns } from "@/components/scan/scheduled/scheduled-scan-columns"
import { useScheduledScans } from "@/hooks/use-scheduled-scans"
import { LoadingState } from "@/components/loading-spinner"
import type { ScheduledScan } from "@/types/scheduled-scan.types"

export function DashboardScheduledScans() {
  const [selected, setSelected] = React.useState<ScheduledScan[]>([])
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const { data, isLoading } = useScheduledScans({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize })
  const router = useRouter()

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString("zh-CN", { hour12: false })
  const handleView = (scan: ScheduledScan) => router.push(`/scan/scheduled/`)
  const handleEdit = (scan: ScheduledScan) => router.push(`/scan/scheduled/`)
  const handleDelete = (scan: ScheduledScan) => {}
  const handleToggleStatus = (scan: ScheduledScan) => {}

  const columns = React.useMemo(
    () =>
      createScheduledScanColumns({
        formatDate,
        handleView,
        handleEdit,
        handleDelete,
        handleToggleStatus,
      }),
    []
  )

  if (isLoading) return <LoadingState message="加载任务数据中..." />

  const list = data?.scheduled_scans ?? []

  return (
    <ScheduledScanDataTable
      data={list}
      columns={columns}
      searchPlaceholder="搜索任务名称..."
    />
  )
}
