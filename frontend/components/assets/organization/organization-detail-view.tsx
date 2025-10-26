"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Building2, Database, Globe, LinkIcon, TrendingUp } from "lucide-react"
import { AssetsDataTable } from "./assets/assets-data-table"
import { createAssetColumns } from "./assets/assets-columns"
import { AddAssetDialog } from "./assets/add-asset-dialog"
import { LoadingState, LoadingSpinner } from "@/components/loading-spinner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { useOrganization, useOrganizationAssets } from "@/hooks/use-organizations"
import { useDeleteAssetFromOrganization } from "@/hooks/use-assets"
import type { Asset } from "@/types/asset.types"

/**
 * 组织详情视图组件
 * 显示组织的统计信息和资产列表
 */
export function OrganizationDetailView({ 
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

  // 使用 React Query 获取组织基本信息
  const {
    data: organization,
    isLoading: isLoadingOrg,
    error: orgError,
  } = useOrganization(parseInt(organizationId))

  // 使用 React Query 获取组织资产列表（支持分页）
  const {
    data: assetsData,
    isLoading: isLoadingAssets,
    error: assetsError,
    refetch
  } = useOrganizationAssets(
    parseInt(organizationId),
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }
  )

  const isLoading = isLoadingOrg || isLoadingAssets
  const error = orgError || assetsError

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

  // 导航函数
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
  const handleAddSuccess = () => {
    setIsAddDialogOpen(false)
    refetch()
  }

  // 处理分页变化
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
    setSelectedAssets([])
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
          {error.message || "加载数据时出现错误，请重试"}
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
    return (
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        {/* 页面头部骨架 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-4 w-96" />
        </div>

        {/* 统计卡片骨架 */}
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* 表格骨架 */}
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="mx-auto text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="text-lg font-semibold mb-2">组织不存在</h3>
        <p className="text-muted-foreground">未找到ID为 {organizationId} 的组织</p>
      </div>
    )
  }

  // 计算统计数据
  const stats = {
    totalAssets: assetsData?.total || 0,
    // 这里可以从后端获取更多统计信息，暂时使用占位数据
    totalDomains: organization.stats?.total_domains || 0,
    totalEndpoints: organization.stats?.total_endpoints || 0,
  }

  return (
    <>
      {/* 页面头部 */}
      <div className="px-4 lg:px-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              {organization.name}
            </h2>
            <p className="text-muted-foreground">
              {organization.description || "暂无描述"}
            </p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        <Card className="@container/card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>主资产总数</CardDescription>
              <Database className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {stats.totalAssets}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>组织关联的主资产数量</span>
            </div>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>域名总数</CardDescription>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {stats.totalDomains}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>已发现的域名数量</span>
            </div>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardDescription>端点总数</CardDescription>
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {stats.totalEndpoints}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>已识别的端点数量</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 资产列表 */}
      <div className="px-4 lg:px-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">主资产列表</h3>
          <p className="text-sm text-muted-foreground">
            管理组织关联的所有主资产
          </p>
        </div>
        <AssetsDataTable
          data={assetsData?.assets || []}
          columns={assetColumns}
          onAddNew={handleAddAsset}
          onBulkDelete={handleBulkDelete}
          onSelectionChange={setSelectedAssets}
          searchPlaceholder="搜索资产..."
          searchColumn="name"
          addButtonText="关联资产"
          pagination={pagination}
          setPagination={setPagination}
          paginationInfo={assetsData ? {
            total: assetsData.total,
            page: assetsData.page,
            pageSize: assetsData.pageSize,
            totalPages: assetsData.totalPages,
          } : undefined}
          onPaginationChange={handlePaginationChange}
        />
      </div>
      
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
