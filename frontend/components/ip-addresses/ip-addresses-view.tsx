"use client"

import React, { useCallback, useMemo, useState } from "react"
import { IPAddressesDataTable } from "./ip-addresses-data-table"
import { createIPAddressColumns } from "./ip-addresses-columns"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import { Button } from "@/components/ui/button"
import { useTargetIPAddresses, useScanIPAddresses, useBulkDeleteIPAddresses } from "@/hooks/use-ip-addresses"
import type { IPAddress } from "@/types/ip-address.types"
import { toast } from "sonner"

export function IPAddressesView({
  targetId,
  scanId,
}: {
  targetId?: number
  scanId?: number
}) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [selectedIPAddresses, setSelectedIPAddresses] = useState<IPAddress[]>([])

  const bulkDeleteMutation = useBulkDeleteIPAddresses()

  const targetQuery = useTargetIPAddresses(
    targetId || 0,
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    },
    { enabled: !!targetId }
  )

  const scanQuery = useScanIPAddresses(
    scanId || 0,
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    },
    { enabled: !!scanId }
  )

  const activeQuery = targetId ? targetQuery : scanQuery
  const { data, isLoading, error, refetch } = activeQuery

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }, [])

  const columns = useMemo(
    () =>
      createIPAddressColumns({
        formatDate,
      }),
    [formatDate]
  )

  const ipAddresses: IPAddress[] = useMemo(() => {
    if (!data?.results) return []
    return data.results.map((item) => ({
      ...item,
      subdomain: item.subdomain || "",
      createdAt: item.createdAt || item.lastSeen,
      reversePointer: item.reversePointer || "",
    }))
  }, [data])

  const paginationInfo = data
    ? {
        total: data.total,
        page: data.page,
        pageSize: data.pageSize,
        totalPages: data.totalPages,
      }
    : undefined

  const handleBulkDelete = useCallback(async () => {
    if (selectedIPAddresses.length === 0) {
      toast.error("请选择要删除的 IP 地址")
      return
    }

    try {
      const ipIds = selectedIPAddresses.map(ip => ip.id)
      await bulkDeleteMutation.mutateAsync(ipIds)
      toast.success(`成功删除 ${selectedIPAddresses.length} 个 IP 地址`)
      setSelectedIPAddresses([]) // 清空选择
    } catch (error) {
      console.error("批量删除失败:", error)
      toast.error("删除失败，请重试")
    }
  }, [selectedIPAddresses, bulkDeleteMutation])

  const handleSelectionChange = useCallback((selectedRows: IPAddress[]) => {
    setSelectedIPAddresses(selectedRows)
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <span className="text-destructive">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">加载失败</h3>
        <p className="text-muted-foreground text-center mb-4">
          {error.message || "加载 IP 地址数据时出现错误，请重试"}
        </p>
        <Button onClick={() => refetch()}>重新加载</Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <DataTableSkeleton
        toolbarButtonCount={1}
        rows={6}
        columns={4}
      />
    )
  }

  return (
    <IPAddressesDataTable
      data={ipAddresses}
      columns={columns}
      searchPlaceholder="搜索 IP 地址或子域名..."
      searchColumn="ip"
      pagination={pagination}
      setPagination={setPagination}
      paginationInfo={paginationInfo}
      onBulkDelete={handleBulkDelete}
      onSelectionChange={handleSelectionChange}
    />
  )
}
