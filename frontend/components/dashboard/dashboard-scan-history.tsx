"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ScanHistoryDataTable } from "@/components/scan/history/scan-history-data-table"
import { createScanHistoryColumns } from "@/components/scan/history/scan-history-columns"
import { useRunningScans } from "@/hooks/use-scans"
import { LoadingState } from "@/components/loading-spinner"
import type { ScanRecord } from "@/types/scan.types"

export function DashboardScanHistory() {
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const { data, isLoading } = useRunningScans(pagination.pageIndex + 1, pagination.pageSize)
  const router = useRouter()

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString("zh-CN", { hour12: false })
  const navigate = (path: string) => router.push(path)
  const handleDelete = () => {}

  const columns = React.useMemo(
    () => createScanHistoryColumns({ formatDate, navigate, handleDelete }) as any,
    []
  )

  if (isLoading) return <LoadingState message="加载扫描历史数据中..." />

  const paginationInfo = data
    ? { total: data.total, page: data.page, pageSize: data.pageSize, totalPages: data.totalPages }
    : undefined

  return (
    <ScanHistoryDataTable
      data={data?.scans ?? []}
      columns={columns as any}
      searchPlaceholder="搜索域名..."
      searchColumn="domainName"
      addButtonText="新建扫描"
      pagination={pagination}
      setPagination={setPagination}
      paginationInfo={paginationInfo}
      onPaginationChange={setPagination}
    />
  )
}
