"use client"

import React, { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { EndpointsDataTable } from "./endpoints-data-table"
import { createEndpointColumns } from "./endpoints-columns"
import { LoadingState } from "@/components/loading-spinner"
import type { Endpoint } from "@/types/endpoint.types"

/**
 * Endpoint 列表组件（使用 React Query）
 * 用于显示和管理 Endpoint 列表
 */
export function EndpointsList({ organizationId }: { organizationId: string }) {
  const [selectedAssets, setSelectedAssets] = useState<Endpoint[]>([])

  // 使用 React Query 获取模拟的 Endpoint 数据
  const {
    data: endpoints,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['endpoints', organizationId],
    queryFn: async (): Promise<Endpoint[]> => {
      // 模拟获取 Endpoint 数据
      const mockEndpoints: Endpoint[] = [
        {
          id: 7,
          url: "https://api.example.com/api/v1/users",
          method: "GET",
          statusCode: 200,
          title: "用户管理API",
          contentLength: 1024,
          domain: "example.com",
          subdomain: "api.example.com",
          createdAt: "2024-01-21T10:15:00Z",
          updatedAt: "2024-03-14T15:30:00Z",
        },
        {
          id: 8,
          url: "https://api.example.com/api/v1/auth",
          method: "POST",
          statusCode: 201,
          title: "认证API",
          contentLength: 512,
          domain: "example.com",
          subdomain: "api.example.com",
          createdAt: "2024-01-22T12:45:00Z",
          updatedAt: "2024-03-13T11:20:00Z",
        },
        {
          id: 9,
          url: "https://admin.example.com/admin/login",
          method: "GET",
          statusCode: 200,
          title: "管理员登录页面",
          contentLength: 2048,
          domain: "example.com",
          subdomain: "admin.example.com",
          createdAt: "2024-01-23T09:30:00Z",
          updatedAt: "2024-03-12T14:15:00Z",
        },
        {
          id: 10,
          url: "https://admin.example.com/admin/dashboard",
          method: "GET",
          statusCode: 200,
          title: "管理员仪表板",
          contentLength: 4096,
          domain: "example.com",
          subdomain: "admin.example.com",
          createdAt: "2024-01-24T11:20:00Z",
          updatedAt: "2024-03-11T16:45:00Z",
        },
        {
          id: 11,
          url: "https://api.example.com/api/v1/products",
          method: "GET",
          statusCode: 404,
          title: "产品API - 未找到",
          contentLength: 256,
          domain: "example.com",
          subdomain: "api.example.com",
          createdAt: "2024-01-25T14:30:00Z",
          updatedAt: "2024-03-10T09:15:00Z",
        },
        {
          id: 12,
          url: "https://test.example.com/health",
          method: "GET",
          statusCode: 500,
          title: "健康检查 - 服务器错误",
          contentLength: 128,
          domain: "example.com",
          subdomain: "test.example.com",
          createdAt: "2024-01-26T16:45:00Z",
          updatedAt: "2024-03-09T12:30:00Z",
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
  const handleEditAsset = (endpoint: Endpoint) => {
    // TODO: 实现编辑功能
    console.info(`编辑端点功能开发中: ${endpoint.url}`)
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
      searchColumn="url"
      addButtonText="添加 Endpoint"
    />
  )
}
