"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ScanHistoryDataTable } from "@/components/scan/history/scan-history-data-table"
import { createScanHistoryColumns } from "@/components/scan/history/scan-history-columns"
import { useRunningScans } from "@/hooks/use-scans"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import type { ScanRecord } from "@/types/scan.types"
import type { ColumnDef } from "@tanstack/react-table"

export function DashboardScanHistory() {
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 5 })
  const { data, isLoading } = useRunningScans(pagination.pageIndex + 1, pagination.pageSize)
  const router = useRouter()

  const formatDate = React.useCallback((dateString: string) => new Date(dateString).toLocaleString("zh-CN", { hour12: false }), [])
  const navigate = React.useCallback((path: string) => router.push(path), [router])
  const handleDelete = React.useCallback(() => {}, [])

  const columns = React.useMemo(
    () => createScanHistoryColumns({ formatDate, navigate, handleDelete }) as ColumnDef<ScanRecord>[],
    [formatDate, navigate, handleDelete]
  )

  if (isLoading) {
    return (
      <DataTableSkeleton
        withPadding={false}
        toolbarButtonCount={2}
        rows={4}
        columns={3}
      />
    )
  }

  const paginationInfo = data
    ? { total: data.total, page: data.page, pageSize: data.pageSize, totalPages: data.totalPages }
    : undefined

  return (
    <ScanHistoryDataTable
      data={data?.scans ?? []}
      columns={columns}
      hideToolbar
      hidePagination
      pagination={pagination}
      setPagination={setPagination}
      paginationInfo={paginationInfo}
      onPaginationChange={setPagination}
    />
  )
}
