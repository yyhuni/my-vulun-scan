"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAssetEndpoints } from "@/hooks/use-assets"
import { useDeleteEndpoint, useBatchDeleteEndpoints } from "@/hooks/use-endpoints"
import { EndpointsDataTable } from "@/components/assets/organization/endpoints/endpoints-data-table"
import { createEndpointColumns } from "@/components/assets/organization/endpoints/endpoints-columns"
import { LoadingState, LoadingSpinner } from "@/components/loading-spinner"
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
import type { Endpoint } from "@/types/endpoint.types"

/**
 * 资产端点详情视图组件
 * 用于显示和管理资产下的端点列表
 */
export function AssetEndpointsDetailView({
  assetId
}: {
  assetId: number
}) {
  const [selectedEndpoints, setSelectedEndpoints] = useState<Endpoint[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [endpointToDelete, setEndpointToDelete] = useState<Endpoint | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  // 分页状态管理
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  })

  // 删除相关 hooks
  const deleteEndpoint = useDeleteEndpoint()
  const batchDeleteEndpoints = useBatchDeleteEndpoints()

  // 使用 React Query 获取资产端点数据
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useAssetEndpoints(assetId, {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  })

  // 辅助函数 - 格式化日期
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  // 导航函数
  const router = useRouter()
  const navigate = (path: string) => {
    router.push(path)
  }

  // 处理删除端点
  const handleDeleteEndpoint = (endpoint: Endpoint) => {
    setEndpointToDelete(endpoint)
    setDeleteDialogOpen(true)
  }

  // 确认删除端点
  const confirmDelete = async () => {
    if (!endpointToDelete) return

    setDeleteDialogOpen(false)
    setEndpointToDelete(null)

    deleteEndpoint.mutate(endpointToDelete.id)
  }

  // 处理批量删除
  const handleBulkDelete = () => {
    if (selectedEndpoints.length === 0) {
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  // 确认批量删除
  const confirmBulkDelete = async () => {
    if (selectedEndpoints.length === 0) return

    const endpointIds = selectedEndpoints.map(endpoint => endpoint.id)

    setBulkDeleteDialogOpen(false)
    setSelectedEndpoints([])

    batchDeleteEndpoints.mutate({ endpointIds })
  }

  // 处理分页变化
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }

  // 创建列定义
  const endpointColumns = useMemo(
    () =>
      createEndpointColumns({
        formatDate,
        navigate,
        handleDelete: handleDeleteEndpoint,
      }),
    [formatDate, navigate, handleDeleteEndpoint]
  )

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <span className="text-destructive">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">加载失败</h3>
        <p className="text-muted-foreground text-center mb-4">
          {error.message || "加载端点数据时出现错误，请重试"}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          重新加载
        </button>
      </div>
    )
  }

  // 加载状态
  if (isLoading) {
    return <LoadingState message="加载端点数据中..." />
  }

  return (
    <>
      <EndpointsDataTable
        data={data?.endpoints || []}
        columns={endpointColumns}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={setSelectedEndpoints}
        searchPlaceholder="搜索端点..."
        searchColumn="url"
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        totalCount={data?.pagination?.total || 0}
        totalPages={data?.pagination?.totalPages || 1}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除该端点及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteEndpoint.isPending}
            >
              {deleteEndpoint.isPending ? (
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
              此操作无法撤销。这将永久删除以下 {selectedEndpoints.length} 个端点及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 p-2 bg-muted rounded-md max-h-96 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedEndpoints.map((endpoint) => (
                <li key={endpoint.id} className="flex items-center">
                  <span className="font-medium font-mono text-xs break-all">{endpoint.url}</span>
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={batchDeleteEndpoints.isPending}
            >
              {batchDeleteEndpoints.isPending ? (
                <>
                  <LoadingSpinner/>
                  删除中...
                </>
              ) : (
                `删除 ${selectedEndpoints.length} 个端点`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
