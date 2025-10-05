"use client"

import React, { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { EndpointsDataTable } from "./endpoints-data-table"
import { createEndpointColumns } from "./endpoints-columns"
import type { Asset } from "@/types/asset.types"

/**
 * Endpoint 列表组件
 * 用于显示和管理 Endpoint 列表
 */
export function EndpointsList({ organizationId }: { organizationId: string }) {
  const [endpoints, setEndpoints] = useState<Asset[]>([])
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)

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
    toast.info(`编辑资产功能开发中: ${asset.name}`)
  }

  // 处理删除资产
  const handleDeleteAsset = (asset: Asset) => {
    toast.info(`删除资产功能开发中: ${asset.name}`)
  }

  // 处理批量删除
  const handleBulkDelete = () => {
    if (selectedAssets.length === 0) {
      toast.error("请先选择要删除的资产")
      return
    }
    toast.info(`批量删除功能开发中，选中 ${selectedAssets.length} 个资产`)
  }

  // 处理添加 Endpoint
  const handleAddEndpoint = () => {
    toast.info("添加 Endpoint 功能开发中")
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
    []
  )

  // 获取 Endpoint 数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // 模拟获取 Endpoint 数据
        const mockEndpoints: Asset[] = [
          {
            id: 7,
            name: "/api/v1/users",
            type: "端点",
            status: "活跃",
            domain: "api.example.com",
            port: 443,
            createdAt: "2024-01-21T10:15:00Z",
            updatedAt: "2024-03-14T15:30:00Z",
          },
          {
            id: 8,
            name: "/api/v1/auth",
            type: "端点",
            status: "存在漏洞",
            domain: "api.example.com",
            port: 443,
            createdAt: "2024-01-22T12:45:00Z",
            updatedAt: "2024-03-13T11:20:00Z",
          },
          {
            id: 9,
            name: "/admin/login",
            type: "端点",
            status: "安全",
            domain: "admin.example.com",
            port: 443,
            createdAt: "2024-01-23T09:30:00Z",
            updatedAt: "2024-03-12T14:15:00Z",
          },
          {
            id: 10,
            name: "/admin/dashboard",
            type: "端点",
            status: "活跃",
            domain: "admin.example.com",
            port: 443,
            createdAt: "2024-01-24T11:20:00Z",
            updatedAt: "2024-03-11T16:45:00Z",
          },
        ]

        // 模拟API延迟
        await new Promise((resolve) => setTimeout(resolve, 500))

        setEndpoints(mockEndpoints)
      } catch (error) {
        console.error("获取 Endpoint 数据失败:", error)
        toast.error("获取 Endpoint 数据失败")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [organizationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">加载 Endpoint 数据中...</span>
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
