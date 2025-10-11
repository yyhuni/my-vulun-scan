"use client"

import React, { useState, useMemo } from "react"
import { MainAssetsDataTable } from "./main-assets-data-table"
import { createMainAssetColumns } from "./main-assets-columns"
import { AddDomainDialog } from "./add-domain-dialog"
import { EditMainAssetDialog } from "./edit-main-asset-dialog"
import { LoadingState } from "@/components/loading-spinner"
import { useCreateDomain, useDeleteDomainFromOrganization } from "@/hooks/use-domains"
import { useOrganizationDomains } from "@/hooks/use-organizations"
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
    deleteDomainMutation.mutate({
      organizationId: parseInt(organizationId),
      domainId: asset.id
    })
  }

  // 处理批量移除（从组织中批量移除域名）
  const handleBulkRemove = () => {
    if (selectedAssets.length === 0) {
      return
    }
    // 批量移除：依次调用移除操作
    selectedAssets.forEach(asset => {
      deleteDomainMutation.mutate({
        organizationId: parseInt(organizationId),
        domainId: asset.id
      })
    })
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
    </>
  )
}
