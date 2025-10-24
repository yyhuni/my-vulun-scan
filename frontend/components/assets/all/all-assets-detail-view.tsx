"use client"

import React, { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAllAssets, useBatchDeleteAssets, useDeleteAsset } from "@/hooks/use-assets"
import { createAllAssetsColumns } from "@/components/assets/all/all-assets-columns"
import { AssetsDataTable } from "@/components/assets/organization/assets/assets-data-table"
import { AddAssetDialog } from "@/components/assets/all/add-asset-dialog"
import { LoadingState } from "@/components/loading-spinner"
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
    if (confirm(`确定要删除资产 "${asset.name}" 吗？`)) {
      deleteAssetMutation.mutate(asset.id)
    }
  }, [deleteAssetMutation])

  // 处理批量删除
  const handleBatchDelete = useCallback(() => {
    if (selectedAssets.length === 0) return
    
    if (confirm(`确定要删除选中的 ${selectedAssets.length} 个资产吗？`)) {
      const assetIds = selectedAssets.map(asset => asset.id)
      batchDeleteMutation.mutate(assetIds)
    }
  }, [selectedAssets, batchDeleteMutation])

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
      />
    </>
  )
}
