"use client"

import React, { useCallback, useMemo, useState } from "react"
import { WebSitesDataTable } from "./websites-data-table"
import { createWebSiteColumns } from "./websites-columns"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import { Button } from "@/components/ui/button"
import { useTargetWebSites, useScanWebSites, useDeleteWebSite, useBulkDeleteWebSites } from "@/hooks/use-websites"
import type { WebSite } from "@/types/website.types"
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

export function WebSitesView({
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
  const [selectedWebSites, setSelectedWebSites] = useState<WebSite[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [websiteToDelete, setWebsiteToDelete] = useState<WebSite | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  const deleteWebSiteMutation = useDeleteWebSite()
  const bulkDeleteMutation = useBulkDeleteWebSites()

  const targetQuery = useTargetWebSites(
    targetId || 0,
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    },
    { enabled: !!targetId }
  )

  const scanQuery = useScanWebSites(
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

  const handleDeleteWebSite = (website: WebSite) => {
    setWebsiteToDelete(website)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!websiteToDelete) return

    setDeleteDialogOpen(false)
    setWebsiteToDelete(null)

    deleteWebSiteMutation.mutate(websiteToDelete.id)
  }

  const columns = useMemo(
    () =>
      createWebSiteColumns({
        formatDate,
        onDelete: handleDeleteWebSite,
      }),
    [formatDate]
  )

  const websites: WebSite[] = useMemo(() => {
    if (!data?.results) return []
    return data.results
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
    if (selectedWebSites.length === 0) {
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  const confirmBulkDelete = async () => {
    if (selectedWebSites.length === 0) return

    const websiteIds = selectedWebSites.map(website => website.id)

    setBulkDeleteDialogOpen(false)
    setSelectedWebSites([])

    bulkDeleteMutation.mutate(websiteIds)
  }

  const handleSelectionChange = useCallback((selectedRows: WebSite[]) => {
    setSelectedWebSites(selectedRows)
  }, [])

  // 处理下载所有网站
  const handleDownloadAll = () => {
    // TODO: 实现下载所有网站功能
    console.log('下载所有网站')
    toast.info("下载功能开发中...")
  }

  // 处理下载选中的网站
  const handleDownloadSelected = () => {
    // TODO: 实现下载选中的网站功能
    console.log('下载选中的网站:', selectedWebSites)
    if (selectedWebSites.length === 0) {
      toast.error("请选择要下载的网站")
      return
    }
    toast.info("下载功能开发中...")
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <span className="text-destructive">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">加载失败</h3>
        <p className="text-muted-foreground text-center mb-4">
          加载网站数据时出现错误，请重试
        </p>
        <Button onClick={() => refetch()}>重新加载</Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <DataTableSkeleton
        toolbarButtonCount={3}
        rows={6}
        columns={6}
      />
    )
  }

  return (
    <>
      <WebSitesDataTable
        data={websites}
        columns={columns}
        searchPlaceholder="搜索网站 URL 或标题..."
        searchColumn="url"
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={paginationInfo}
        onPaginationChange={setPagination}
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
              此操作无法撤销。这将永久删除网站 &quot;{websiteToDelete?.url}&quot; 及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
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
              此操作无法撤销。这将永久删除以下 {selectedWebSites.length} 个网站及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 p-2 bg-muted rounded-md max-h-96 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedWebSites.map((website) => (
                <li key={website.id} className="flex items-center">
                  <span className="font-medium font-mono">{website.url}</span>
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
                `删除 ${selectedWebSites.length} 个网站`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
