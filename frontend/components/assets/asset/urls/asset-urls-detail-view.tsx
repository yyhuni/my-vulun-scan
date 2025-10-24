"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAssetUrls } from "@/hooks/use-assets"
import { useDeleteUrl, useBatchDeleteUrls } from "@/hooks/use-urls"
import { UrlsDataTable } from "@/components/assets/organization/urls/urls-data-table"
import { createUrlColumns } from "@/components/assets/organization/urls/urls-columns"
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
import type { Url } from "@/types/url.types"

/**
 * 资产 URL 详情视图组件
 * 用于显示和管理资产下的 URL 列表
 */
export function AssetUrlsDetailView({
  assetId
}: {
  assetId: number
}) {
  const [selectedUrls, setSelectedUrls] = useState<Url[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [urlToDelete, setUrlToDelete] = useState<Url | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  // 分页状态管理
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  })

  // 删除相关 hooks
  const deleteUrl = useDeleteUrl()
  const batchDeleteUrls = useBatchDeleteUrls()

  // 使用 React Query 获取资产 URL 数据
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useAssetUrls(assetId, {
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

  // 处理删除 URL
  const handleDeleteUrl = (url: Url) => {
    setUrlToDelete(url)
    setDeleteDialogOpen(true)
  }

  // 确认删除 URL
  const confirmDelete = async () => {
    if (!urlToDelete) return

    setDeleteDialogOpen(false)
    setUrlToDelete(null)

    deleteUrl.mutate(urlToDelete.id)
  }

  // 处理批量删除
  const handleBulkDelete = () => {
    if (selectedUrls.length === 0) {
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  // 确认批量删除
  const confirmBulkDelete = async () => {
    if (selectedUrls.length === 0) return

    const urlIds = selectedUrls.map(url => url.id)

    setBulkDeleteDialogOpen(false)
    setSelectedUrls([])

    batchDeleteUrls.mutate({ urlIds })
  }

  // 处理分页变化
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }

  // 创建列定义
  const urlColumns = useMemo(
    () =>
      createUrlColumns({
        formatDate,
        navigate,
        handleDelete: handleDeleteUrl,
      }),
    [formatDate, navigate, handleDeleteUrl]
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
          {error.message || "加载 URL 数据时出现错误，请重试"}
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
    return <LoadingState message="加载 URL 数据中..." />
  }

  return (
    <>
      <UrlsDataTable
        data={data?.urls || []}
        columns={urlColumns}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={setSelectedUrls}
        searchPlaceholder="搜索 URL..."
        searchColumn="url"
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={{
          total: data?.pagination.total || 0,
          page: data?.pagination.page || 1,
          pageSize: data?.pagination.pageSize || 10,
          totalPages: data?.pagination.totalPages || 1,
        }}
        onPaginationChange={handlePaginationChange}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除该 URL 及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUrl.isPending}
            >
              {deleteUrl.isPending ? (
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
              此操作无法撤销。这将永久删除以下 {selectedUrls.length} 个 URL 及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 p-2 bg-muted rounded-md max-h-96 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedUrls.map((url) => (
                <li key={url.id} className="flex items-center">
                  <span className="font-medium font-mono text-xs break-all">{url.url}</span>
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={batchDeleteUrls.isPending}
            >
              {batchDeleteUrls.isPending ? (
                <>
                  <LoadingSpinner/>
                  删除中...
                </>
              ) : (
                `删除 ${selectedUrls.length} 个 URL`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
