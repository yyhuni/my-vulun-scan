"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { EndpointsDataTable } from "./endpoints-data-table"
import { createEndpointColumns } from "./endpoints-columns"
import { AddEndpointDialog } from "./add-endpoint-dialog"
import { EditEndpointDialog } from "./edit-endpoint-dialog"
import { LoadingState } from "@/components/loading-spinner"
import { useEndpoints } from "@/hooks/use-endpoints"
import type { Endpoint } from "@/types/endpoint.types"

/**
 * Endpoint 列表组件（使用 React Query）
 * 用于显示和管理 Endpoint 列表
 */
export function EndpointsList({ organizationId }: { organizationId: string }) {
  const [selectedAssets, setSelectedAssets] = useState<Endpoint[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingEndpoint, setEditingEndpoint] = useState<Endpoint | null>(null)
  
  // 分页状态管理
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  })

  // 使用 React Query 获取 Endpoint 数据
  const {
    data: endpointsResponse,
    isLoading,
    error,
    refetch
  } = useEndpoints({
    page: pagination.pageIndex + 1, // API 使用 1-based 页码
    pageSize: pagination.pageSize,
    sortBy: 'updated_at',
    sortOrder: 'desc'
  })
  
  // 提取 endpoints 数据
  const endpoints = endpointsResponse?.endpoints || []
  const totalCount = endpointsResponse?.total || 0
  const totalPages = endpointsResponse?.totalPages || 0  // 注意：已被 api-client 转换为驼峰

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

  // 处理编辑资产
  const handleEditAsset = (endpoint: Endpoint) => {
    setEditingEndpoint(endpoint)
  }

  // 处理编辑成功回调
  const handleEditSuccess = (updatedEndpoint: Endpoint) => {
    // 刷新数据
    refetch()
    setEditingEndpoint(null)
  }

  // 处理删除资产
  const handleDeleteAsset = (endpoint: Endpoint) => {
    // TODO: 实现删除功能
    console.info(`删除端点功能开发中: ${endpoint.url}`)
  }

  // 处理批量删除
  const handleBulkDelete = () => {
    if (selectedAssets.length === 0) {
      return
    }
    // TODO: 实现批量删除功能
    console.info(`批量删除功能开发中，选中 ${selectedAssets.length} 个端点`)
  }

  // 处理添加 Endpoint
  const handleAddEndpoint = () => {
    setShowAddDialog(true)
  }

  // 处理添加成功回调
  const handleAddSuccess = (newEndpoints: Endpoint[]) => {
    // 刷新数据
    refetch()
    setShowAddDialog(false)
  }

  // 创建列定义
  const endpointColumns = useMemo(
    () =>
      createEndpointColumns({
        formatDate,
        navigate,
        handleEdit: handleEditAsset,
        handleDelete: handleDeleteAsset,
      }),
    [formatDate, navigate, handleEditAsset, handleDeleteAsset]
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

  // 空数据状态
  if (!endpoints || endpoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-3 mb-4">
          <span className="text-muted-foreground">🔗</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">暂无端点</h3>
        <p className="text-muted-foreground text-center mb-4">
          该组织还没有任何端点数据
        </p>
      </div>
    )
  }

  return (
    <>
      <EndpointsDataTable
        data={endpoints}
        columns={endpointColumns}
        onAddNew={handleAddEndpoint}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={setSelectedAssets}
        searchPlaceholder="搜索 Endpoint..."
        searchColumn="url"
        addButtonText="添加 Endpoint"
        pagination={pagination}
        onPaginationChange={setPagination}
        totalCount={totalCount}
        totalPages={totalPages}
      />
      
      {/* 添加 Endpoint 对话框 */}
      <AddEndpointDialog
        organizationId={organizationId}
        onAdd={handleAddSuccess}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
      
      {/* 编辑 Endpoint 对话框 */}
      {editingEndpoint && (
        <EditEndpointDialog
          endpoint={editingEndpoint}
          onEdit={handleEditSuccess}
          open={!!editingEndpoint}
          onOpenChange={(open) => {
            if (!open) {
              setEditingEndpoint(null)
            }
          }}
        />
      )}
    </>
  )
}
