"use client"

import React, { useState, useMemo } from "react"
import { MainAssetsDataTable } from "./main-assets-data-table"
import { createMainAssetColumns } from "./main-assets-columns"
import { AddDomainDialog } from "./add-domain-dialog"
import { EditMainAssetDialog } from "./edit-main-asset-dialog"
import { LoadingState } from "@/components/loading-spinner"
import { useCreateDomain, useDeleteDomainFromOrganization } from "@/hooks/use-domains"
import { useOrganizationDomains } from "@/hooks/use-organizations"
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

/**
 * 主资产列表组件
 * 用于显示和管理主资产列表
 */
export function MainAssetsList({ organizationId }: { organizationId: string }) {
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  
  // 确认对话框状态
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [bulkRemoveDialogOpen, setBulkRemoveDialogOpen] = useState(false)
  const [assetToRemove, setAssetToRemove] = useState<Asset | null>(null)
  
  // 分页状态
  const [pagination, setPagination] = useState({
    pageIndex: 0,  // 0-based for react-table
    pageSize: 10,
  })

  // 使用 React Query 获取组织的域名数据
  const {
    data,
    isLoading,
    error,
    refetch
  } = useOrganizationDomains(parseInt(organizationId), {
    page: pagination.pageIndex + 1, // 转换为 1-based
    pageSize: pagination.pageSize,
    sortBy: "updated_at",
    sortOrder: "desc"
  })

  // 移除域名 mutation
  const deleteDomainMutation = useDeleteDomainFromOrganization()

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
  const navigate = (path: string) => {
    window.location.href = path
  }

  // 处理编辑资产
  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset)
    setIsEditDialogOpen(true)
  }

  // 处理移除资产（从组织中移除域名）
  const handleRemoveAsset = (asset: Asset) => {
    setAssetToRemove(asset)
    setRemoveDialogOpen(true)
  }

  // 确认移除单个资产
  const confirmRemoveAsset = () => {
    if (!assetToRemove) return
    
    deleteDomainMutation.mutate({
      organizationId: parseInt(organizationId),
      domainId: assetToRemove.id
    })
    
    setRemoveDialogOpen(false)
    setAssetToRemove(null)
  }

  // 处理批量移除（从组织中批量移除域名）
  const handleBulkRemove = () => {
    if (selectedAssets.length === 0) {
      return
    }
    setBulkRemoveDialogOpen(true)
  }

  // 确认批量移除
  const confirmBulkRemove = () => {
    if (selectedAssets.length === 0) return
    
    // 批量移除：依次调用移除操作
    selectedAssets.forEach(asset => {
      deleteDomainMutation.mutate({
        organizationId: parseInt(organizationId),
        domainId: asset.id
      })
    })
    
    setBulkRemoveDialogOpen(false)
    // 清空选中状态
    setSelectedAssets([])
  }

  // 处理添加主资产
  const handleAddMainAsset = () => {
    setIsAddDialogOpen(true)
  }

  // 处理添加成功
  const handleAddSuccess = async (newDomains: Asset[]) => {
    // React Query 会自动刷新数据，不需要手动处理
    setIsAddDialogOpen(false)
  }

  // 处理编辑成功
  const handleEditSuccess = async (updatedAsset: Asset) => {
    // React Query 会自动刷新数据，不需要手动处理
    setIsEditDialogOpen(false)
    setEditingAsset(null)
  }

  // 处理分页变化
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }

  // 创建列定义
  const mainAssetColumns = useMemo(
    () =>
      createMainAssetColumns({
        formatDate,
        navigate,
        handleEdit: handleEditAsset,
        handleRemove: handleRemoveAsset,
      }),
    [formatDate, navigate, handleEditAsset, handleRemoveAsset]
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
          {error.message || "加载主资产数据时出现错误，请重试"}
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
    return <LoadingState message="加载主资产数据中..." />
  }



  return (
    <>
      <MainAssetsDataTable
        data={data.domains}
        columns={mainAssetColumns}
        onAddNew={handleAddMainAsset}
        onBulkRemove={handleBulkRemove}
        onSelectionChange={setSelectedAssets}
        searchPlaceholder="搜索主资产..."
        searchColumn="name"
        addButtonText="添加主资产"
        // 分页相关属性
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={{
          total: data.total || 0,
          page: data.page || 1,
          pageSize: data.pageSize || 10,
          totalPages: data.totalPages || 0,
        }}
        onPaginationChange={handlePaginationChange}
      />
      
      {/* 添加域名对话框 */}
      <AddDomainDialog
        organizationId={organizationId}
        onAdd={handleAddSuccess}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
      
      {/* 编辑主资产对话框 */}
      {editingAsset && (
        <EditMainAssetDialog
          asset={editingAsset}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onEdit={handleEditSuccess}
        />
      )}

      {/* 单个移除确认对话框 */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除域名</AlertDialogTitle>
            <AlertDialogDescription>
              确定要从当前组织中移除以下域名吗？此操作将解除域名与组织的关联关系。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {assetToRemove && (
            <div className="mt-2 p-3 bg-muted rounded-md">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center">
                  <span className="text-sm font-medium">域名：</span>
                  <span className="ml-2 font-mono text-sm">{assetToRemove.name}</span>
                </div>
                {assetToRemove.description && (
                  <div className="flex items-start">
                    <span className="text-sm font-medium">描述：</span>
                    <span className="ml-2 text-sm text-muted-foreground">{assetToRemove.description}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveAsset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量移除确认对话框 */}
      <AlertDialog open={bulkRemoveDialogOpen} onOpenChange={setBulkRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量移除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要从当前组织中移除以下 {selectedAssets.length} 个域名吗？此操作将解除这些域名与组织的关联关系。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 p-3 bg-muted rounded-md max-h-60 overflow-y-auto">
            <ul className="text-sm space-y-2">
              {selectedAssets.map((asset) => (
                <li key={asset.id} className="flex flex-col space-y-1 border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center">
                    <span className="font-medium font-mono">{asset.name}</span>
                  </div>
                  {asset.description && (
                    <span className="text-muted-foreground text-xs">{asset.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认移除全部
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
