"use client"

import React, { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAllAssets, useBatchDeleteAssets, useDeleteAsset } from "@/hooks/use-assets"
import { createAllAssetsColumns } from "@/components/assets/all/all-assets-columns"
import { AssetsDataTable } from "@/components/assets/organization/assets/assets-data-table"
import { AddAssetDialog } from "@/components/assets/all/add-asset-dialog"
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
import type { Asset } from "@/types/asset.types"
import { formatDate } from "@/lib/utils"

/**
 * 所有资产详情视图组件
 * 显示系统中所有资产的列表，支持搜索、分页、删除等操作
 */
export function AllAssetsDetailView() {
  const router = useRouter()
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [shouldPrefetchOrgs, setShouldPrefetchOrgs] = useState(false)

  // 获取所有资产列表
  const { data: assetsData, isLoading, error } = useAllAssets({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  })

  // 删除单个资产
  const deleteAssetMutation = useDeleteAsset()

  // 批量删除资产
  const batchDeleteMutation = useBatchDeleteAssets()

  // 处理添加资产
  const handleAddAsset = useCallback(() => {
    setIsAddDialogOpen(true)
  }, [])

  // 处理删除单个资产
  const handleDeleteAsset = useCallback((asset: Asset) => {
    setAssetToDelete(asset)
    setDeleteDialogOpen(true)
  }, [])

  // 确认删除资产
  const confirmDelete = async () => {
    if (!assetToDelete) return

    setDeleteDialogOpen(false)
    setAssetToDelete(null)

    deleteAssetMutation.mutate(assetToDelete.id)
  }

  // 处理批量删除
  const handleBatchDelete = useCallback(() => {
    if (selectedAssets.length === 0) return
    setBulkDeleteDialogOpen(true)
  }, [selectedAssets])

  // 确认批量删除
  const confirmBulkDelete = async () => {
    if (selectedAssets.length === 0) return

    const assetIds = selectedAssets.map(asset => asset.id)

    setBulkDeleteDialogOpen(false)
    setSelectedAssets([])

    batchDeleteMutation.mutate(assetIds)
  }

  // 创建表格列
  const columns = createAllAssetsColumns({
    formatDate,
    navigate: (path: string) => router.push(path),
    handleDelete: handleDeleteAsset,
  })

  // 加载中
  if (isLoading) {
    return <LoadingState message="加载资产数据中..." />
  }

  // 错误处理
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-4">加载失败</p>
          <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : '未知错误'}</p>
        </div>
      </div>
    )
  }

  const assets = assetsData?.assets || []
  const paginationInfo = assetsData?.pagination

  return (
    <>
      <AssetsDataTable
        data={assets}
        columns={columns}
        onAddNew={handleAddAsset}
        onAddHover={() => setShouldPrefetchOrgs(true)}
        onBulkDelete={handleBatchDelete}
        onSelectionChange={setSelectedAssets}
        searchPlaceholder="搜索资产名称..."
        searchColumn="name"
        addButtonText="添加主资产"
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={paginationInfo}
        onPaginationChange={setPagination}
      />

      {/* 添加资产对话框 */}
      <AddAssetDialog
        onAdd={() => {
          setIsAddDialogOpen(false)
        }}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        prefetchEnabled={shouldPrefetchOrgs}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除资产</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除资产 &quot;{assetToDelete?.name}&quot; 及其所有关联的域名数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAssetMutation.isPending}
            >
              {deleteAssetMutation.isPending ? (
                <>
                  <LoadingSpinner/>
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认对话框 */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除资产</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除以下 {selectedAssets.length} 个资产及其所有关联的域名数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* 资产列表容器 - 固定最大高度并支持滚动 */}
          <div className="mt-2 p-2 bg-muted rounded-md max-h-96 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedAssets.map((asset) => (
                <li key={asset.id} className="flex items-center">
                  <span className="font-medium">{asset.name}</span>
                  {asset.description && (
                    <span className="text-muted-foreground ml-2">- {asset.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={batchDeleteMutation.isPending}
            >
              {batchDeleteMutation.isPending ? (
                <>
                  <LoadingSpinner/>
                  删除中...
                </>
              ) : (
                `确认删除 ${selectedAssets.length} 个资产`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
