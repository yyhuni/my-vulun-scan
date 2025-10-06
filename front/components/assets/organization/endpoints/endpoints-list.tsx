"use client"

import React, { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { EndpointsDataTable } from "./endpoints-data-table"
import { createEndpointColumns } from "./endpoints-columns"
import { LoadingState } from "@/components/ui/loading-spinner"
import type { Asset } from "@/types/asset.types"

/**
 * Endpoint 列表组件（使用 React Query）
 * 用于显示和管理 Endpoint 列表
 */
export function EndpointsList({ organizationId }: { organizationId: string }) {
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([])

  // 使用 React Query 获取模拟的 Endpoint 数据
  const {
    data: endpoints,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['endpoints', organizationId],
    queryFn: async (): Promise<Asset[]> => {
      // 模拟获取 Endpoint 数据
      const mockEndpoints: Asset[] = [
        {
          id: 7,
          name: "/api/v1/users",
          description: "用户管理API端点",
          createdAt: "2024-01-21T10:15:00Z",
          updatedAt: "2024-03-14T15:30:00Z",
        },
        {
          id: 8,
          name: "/api/v1/auth",
          description: "认证API端点",
          createdAt: "2024-01-22T12:45:00Z",
          updatedAt: "2024-03-13T11:20:00Z",
        },
        {
          id: 9,
          name: "/admin/login",
          description: "管理员登录页面",
          createdAt: "2024-01-23T09:30:00Z",
          updatedAt: "2024-03-12T14:15:00Z",
        },
        {
          id: 10,
          name: "/admin/dashboard",
          description: "管理员仪表板",
          createdAt: "2024-01-24T11:20:00Z",
          updatedAt: "2024-03-11T16:45:00Z",
        },
      ]

      // 模拟API延迟
      await new Promise((resolve) => setTimeout(resolve, 500))
      return mockEndpoints
    },
    staleTime: 5 * 60 * 1000, // 5分钟
  })

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
    // TODO: 实现编辑功能
    console.info(`编辑端点功能开发中: ${asset.name}`)
  }

  // 处理删除资产
  const handleDeleteAsset = (asset: Asset) => {
    // TODO: 实现删除功能
    console.info(`删除端点功能开发中: ${asset.name}`)
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
    // TODO: 实现添加功能
    console.info("添加 Endpoint 功能开发中")
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
    <EndpointsDataTable
      data={endpoints}
      columns={endpointColumns}
      onAddNew={handleAddEndpoint}
      onBulkDelete={handleBulkDelete}
      onSelectionChange={setSelectedAssets}
      searchPlaceholder="搜索端点..."
      searchColumn="name"
      addButtonText="添加 Endpoint"
    />
  )
}
