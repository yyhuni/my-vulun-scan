"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AssetsDataTable } from "./assets-data-table"
import { createAssetColumns } from "./assets-columns"
import { AddAssetDialog } from "./add-asset-dialog"
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
import { useOrganization } from "@/hooks/use-organizations"
import { useDeleteAssetFromOrganization } from "@/hooks/use-assets"
import type { Asset } from "@/types/asset.types"

/**
 * 组织资产详情视图组件（使用 React Query）
 * 用于显示和管理组织下的资产列表
 * 支持通过组织ID获取数据
 */
export function OrganizationAssetsDetailView({ 
  organizationId 
}: { 
  organizationId: string
}) {
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  
  // 分页状态
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // 使用 React Query 获取组织数据
  const {
    data: organization,
    isLoading,
    error,
    refetch
  } = useOrganization(parseInt(organizationId))

  // Mutations
  const deleteAssetMutation = useDeleteAssetFromOrganization()

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
  const handleDeleteAsset = (asset: Asset) => {
    setAssetToDelete(asset)
    setDeleteDialogOpen(true)
  }

  // 确认删除资产
  const confirmDelete = async () => {
    if (!assetToDelete) return

    setDeleteDialogOpen(false)
    setAssetToDelete(null)
    
    deleteAssetMutation.mutate({
      organizationId: parseInt(organizationId),
      assetId: assetToDelete.id,
    })
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

    const deletedIds = selectedAssets.map(asset => asset.id)
    
    setBulkDeleteDialogOpen(false)
    setSelectedAssets([])
    
    // 逐个删除资产
    for (const assetId of deletedIds) {
      deleteAssetMutation.mutate({
        organizationId: parseInt(organizationId),
        assetId,
      })
    }
  }

  // 处理添加资产
  const handleAddAsset = () => {
    setIsAddDialogOpen(true)
  }

  // 处理添加成功
  const handleAddSuccess = async (newAssets: Asset[]) => {
    setIsAddDialogOpen(false)
  }

  // 处理分页变化
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }

  // 创建列定义
  const assetColumns = useMemo(
    () =>
      createAssetColumns({
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
          {error.message || "加载资产数据时出现错误，请重试"}
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
    return <LoadingState message="加载资产数据中..." />
  }

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">组织不存在</p>
      </div>
    )
  }

  return (
    <>
      <AssetsDataTable
        data={organization.assets || []}
        columns={assetColumns}
        onAddNew={handleAddAsset}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={setSelectedAssets}
        searchPlaceholder="搜索资产..."
        searchColumn="name"
        addButtonText="关联资产"
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={{
          total: organization.assets?.length || 0,
          page: 1,
          pageSize: pagination.pageSize,
          totalPages: Math.ceil((organization.assets?.length || 0) / pagination.pageSize),
        }}
        onPaginationChange={handlePaginationChange}
      />
      
      {/* 添加资产对话框 */}
      <AddAssetDialog
        organizationId={parseInt(organizationId)}
        organizationName={organization.name}
        onAdd={handleAddSuccess}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除资产</AlertDialogTitle>
            <AlertDialogDescription>
              确定要从此组织中移除资产 &quot;{assetToDelete?.name}&quot; 吗？此操作只会解除资产与组织的关联关系，资产本身不会被删除。
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
                  移除中...
                </>
              ) : (
                "确认移除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认对话框 */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量移除资产</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将从组织中移除以下 {selectedAssets.length} 个资产。资产本身不会被删除，仍可正常使用。
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
              disabled={deleteAssetMutation.isPending}
            >
              {deleteAssetMutation.isPending ? (
                <>
                  <LoadingSpinner/>
                  移除中...
                </>
              ) : (
                `确认移除 ${selectedAssets.length} 个资产`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
