"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { EndpointsDataTable } from "./endpoints-data-table"
import { createEndpointColumns } from "./endpoints-columns"
import { AddEndpointDialog } from "./add-endpoint-dialog"
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
import { useEndpointsByDomain, useDeleteEndpoint, useBatchDeleteEndpoints } from "@/hooks/use-endpoints"
import { useDomain } from "@/hooks/use-domains"
import type { Endpoint } from "@/types/endpoint.types"

/**
 * Endpoint 列表组件（使用 React Query）
 * 用于显示和管理 Endpoint 列表
 * 支持通过组织ID或域名ID获取数据
 */
export function EndpointsList({ 
  organizationId, 
  domainId 
}: { 
  organizationId?: string
  domainId?: string 
}) {
  const [selectedAssets, setSelectedAssets] = useState<Endpoint[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [endpointToDelete, setEndpointToDelete] = useState<Endpoint | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  
  // 分页状态管理
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  })

  // 获取当前域名信息（用于校验）
  const { data: currentDomain } = useDomain(domainId ? parseInt(domainId) : 0)

  // 删除相关 hooks
  const deleteEndpoint = useDeleteEndpoint()
  const batchDeleteEndpoints = useBatchDeleteEndpoints()

  // 使用 React Query 获取 Endpoint 数据（使用专用路由）
  const {
    data: endpointsResponse,
    isLoading,
    error,
    refetch,
  } = useEndpointsByDomain(domainId ? parseInt(domainId) : 0, {
    page: pagination.pageIndex + 1, // API 使用 1-based 页码
    pageSize: pagination.pageSize,
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

  // 处理删除资产
  const handleDeleteAsset = (endpoint: Endpoint) => {
    setEndpointToDelete(endpoint)
    setDeleteDialogOpen(true)
  }

  // 确认删除端点
  const confirmDelete = async () => {
    if (!endpointToDelete) return

    setDeleteDialogOpen(false)
    setEndpointToDelete(null)
    
    deleteEndpoint.mutate(endpointToDelete.id)
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

    const endpointIds = selectedAssets.map(endpoint => endpoint.id)
    
    setBulkDeleteDialogOpen(false)
    setSelectedAssets([])
    
    batchDeleteEndpoints.mutate({ endpointIds })
  }

  // 处理添加 Endpoint
  const handleAddEndpoint = () => {
    setShowAddDialog(true)
  }

  // 处理添加成功回调
  const handleAddSuccess = (newEndpoints: Endpoint[]) => {
    // React Query 会通过 invalidateQueries 自动刷新数据，无需手动 refetch
    setShowAddDialog(false)
  }

  // 创建列定义
  const endpointColumns = useMemo(
    () =>
      createEndpointColumns({
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
          加载端点数据失败，请检查网络连接后重试
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
        addButtonText="Add Endpoint"
        pagination={pagination}
        onPaginationChange={setPagination}
        totalCount={totalCount}
        totalPages={totalPages}
      />
      
      {/* 添加 Endpoint 对话框 - 只在通过域名访问时显示 */}
      {domainId && (
        <AddEndpointDialog
          domainId={domainId}
          currentDomainName={currentDomain?.name}
          onAdd={handleAddSuccess}
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
        />
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除端点 &quot;{endpointToDelete?.url}&quot; 及其相关数据（包括关联的 Vulnerabilities）。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteEndpoint.isPending}
            >
              {deleteEndpoint.isPending ? (
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
              此操作无法撤销。这将永久删除以下 {selectedAssets.length} 个端点及其相关数据（包括关联的 Vulnerabilities）。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* 端点列表容器 - 固定最大高度并支持滚动 */}
          <div className="mt-2 p-2 bg-muted rounded-md max-h-96 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedAssets.map((endpoint) => (
                <li key={endpoint.id} className="flex items-center flex-wrap">
                  <span className="font-medium text-xs mr-2">{endpoint.method || 'GET'}</span>
                  <span className="font-mono text-xs truncate flex-1">{endpoint.url}</span>
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={batchDeleteEndpoints.isPending}
            >
              {batchDeleteEndpoints.isPending ? (
                <>
                  <LoadingSpinner/>
                  删除中...
                </>
              ) : (
                `删除 ${selectedAssets.length} 个端点`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
