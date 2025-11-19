"use client"

import React, { useCallback, useMemo, useState } from "react"
import { IPAddressesDataTable } from "./ip-addresses-data-table"
import { createIPAddressColumns } from "./ip-addresses-columns"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import { Button } from "@/components/ui/button"
import { useTargetIPAddresses, useScanIPAddresses, useDeleteIPAddress, useBulkDeleteIPAddresses } from "@/hooks/use-ip-addresses"
import type { IPAddress } from "@/types/ip-address.types"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { LoadingSpinner } from "@/components/loading-spinner"

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ipToDelete, setIPToDelete] = useState<IPAddress | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  const deleteIPMutation = useDeleteIPAddress()
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

  const handleDeleteIP = (ipAddress: IPAddress) => {
    setIPToDelete(ipAddress)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!ipToDelete) return

    setDeleteDialogOpen(false)
    setIPToDelete(null)

    deleteIPMutation.mutate(ipToDelete.id)
  }

  const columns = useMemo(
    () =>
      createIPAddressColumns({
        formatDate,
        onDelete: handleDeleteIP,
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

  const handleBulkDelete = () => {
    if (selectedIPAddresses.length === 0) {
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  const confirmBulkDelete = async () => {
    if (selectedIPAddresses.length === 0) return

    const ipIds = selectedIPAddresses.map(ip => ip.id)

    setBulkDeleteDialogOpen(false)
    setSelectedIPAddresses([])

    bulkDeleteMutation.mutate(ipIds)
  }

  const handleSelectionChange = useCallback((selectedRows: IPAddress[]) => {
    setSelectedIPAddresses(selectedRows)
  }, [])

  // 处理下载所有 IP 地址
  const handleDownloadAll = () => {
    // TODO: 实现下载所有 IP 地址功能
    console.log('下载所有 IP 地址')
  }

  // 处理下载选中的 IP 地址
  const handleDownloadSelected = () => {
    // TODO: 实现下载选中的 IP 地址功能
    console.log('下载选中的 IP 地址:', selectedIPAddresses)
    if (selectedIPAddresses.length === 0) {
      return
    }
  }

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
    <>
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
        onDownloadAll={handleDownloadAll}
        onDownloadSelected={handleDownloadSelected}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除 IP 地址 &quot;{ipToDelete?.ip}&quot; 及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteIPMutation.isPending}
            >
              {deleteIPMutation.isPending ? (
                <>
                  <LoadingSpinner/>
                  删除中...
                </>
              ) : (
                "删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认对话框 */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除以下 {selectedIPAddresses.length} 个 IP 地址及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 p-2 bg-muted rounded-md max-h-96 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedIPAddresses.map((ip) => (
                <li key={ip.id} className="flex items-center">
                  <span className="font-medium font-mono">{ip.ip}</span>
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <LoadingSpinner/>
                  删除中...
                </>
              ) : (
                `删除 ${selectedIPAddresses.length} 个 IP 地址`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
