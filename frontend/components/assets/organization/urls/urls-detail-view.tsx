"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { UrlsDataTable } from "./urls-data-table"
import { createUrlColumns } from "./urls-columns"
import { AddUrlDialog } from "./add-url-dialog"
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
import { useUrlsByDomain, useDeleteUrl, useBatchDeleteUrls } from "@/hooks/use-urls"
import { useDomain } from "@/hooks/use-domains"
import type { Url } from "@/types/url.types"

/**
 * 组织 URL 详情视图组件（使用 React Query）
 * 用于显示和管理组织下的 URL 列表
 * 支持通过组织ID或域名ID获取数据
 */
export function OrganizationUrlsDetailView({ 
  organizationId, 
  domainId 
}: { 
  organizationId?: string
  domainId?: string 
}) {
  const [selectedAssets, setSelectedAssets] = useState<Url[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [urlToDelete, setUrlToDelete] = useState<Url | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  
  // 分页状态管理
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  })

  // 获取当前域名信息（用于校验）
  const { data: currentDomain } = useDomain(domainId ? parseInt(domainId) : 0)

  // 删除相关 hooks
  const deleteUrl = useDeleteUrl()
  const batchDeleteUrls = useBatchDeleteUrls()

  // 使用 React Query 获取 URL 数据（使用专用路由）
  const {
    data: urlsResponse,
    isLoading,
    error,
    refetch,
  } = useUrlsByDomain(domainId ? parseInt(domainId) : 0, {
    page: pagination.pageIndex + 1, // API 使用 1-based 页码
    pageSize: pagination.pageSize,
  })
  
  // 提取 urls 数据
  const urls = urlsResponse?.urls || []
  const totalCount = urlsResponse?.total || 0
  const totalPages = urlsResponse?.totalPages || 0  // 注意：已被 api-client 转换为驼峰

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

  // 导航函数（使用 Next.js 客户端路由）
  const router = useRouter()
  const navigate = (path: string) => {
    router.push(path)
  }

  // 处理删除资产
  const handleDeleteAsset = (url: Url) => {
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
    if (selectedAssets.length === 0) {
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  // 确认批量删除
  const confirmBulkDelete = async () => {
    if (selectedAssets.length === 0) return

    const urlIds = selectedAssets.map(url => url.id)
    
    setBulkDeleteDialogOpen(false)
    setSelectedAssets([])
    
    batchDeleteUrls.mutate({ urlIds })
  }

  // 处理添加 URL
  const handleAddUrl = () => {
    setShowAddDialog(true)
  }

  // 处理添加成功回调
  const handleAddSuccess = (newUrls: Url[]) => {
    // React Query 会通过 invalidateQueries 自动刷新数据，无需手动 refetch
    setShowAddDialog(false)
  }

  // 创建列定义
  const urlColumns = useMemo(
    () =>
      createUrlColumns({
        formatDate,
        navigate,
        handleDelete: handleDeleteAsset,
      }),
    [formatDate, navigate, handleDeleteAsset]
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
          加载 URL 数据失败，请检查网络连接后重试
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
        data={urls}
        columns={urlColumns}
        onAddNew={handleAddUrl}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={setSelectedAssets}
        searchPlaceholder="搜索 URL..."
        searchColumn="url"
        addButtonText="添加 URL"
        pagination={pagination}
        onPaginationChange={setPagination}
        totalCount={totalCount}
        totalPages={totalPages}
      />
      
      {/* 添加 URL 对话框 */}
      <AddUrlDialog
        domainId={domainId}
        currentDomainName={currentDomain?.name}
        onAdd={handleAddSuccess}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除 URL &quot;{urlToDelete?.url}&quot; 及其相关数据（包括关联的 Vulnerabilities）。
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
              此操作无法撤销。这将永久删除以下 {selectedAssets.length} 个 URL 及其相关数据（包括关联的 Vulnerabilities）。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* URL 列表容器 - 固定最大高度并支持滚动 */}
          <div className="mt-2 p-2 bg-muted rounded-md max-h-96 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedAssets.map((url) => (
                <li key={url.id} className="flex items-center flex-wrap">
                  <span className="font-medium text-xs mr-2">{url.method || 'GET'}</span>
                  <span className="font-mono text-xs truncate flex-1">{url.url}</span>
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
                `删除 ${selectedAssets.length} 个 URL`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
