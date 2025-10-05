"use client"

import React, { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { SubdomainsDataTable } from "./subdomains-data-table"
import { createSubdomainColumns } from "./subdomains-columns"
import type { Asset } from "@/types/asset.types"

/**
 * 子域名列表组件
 * 用于显示和管理子域名列表
 */
export function SubdomainsList({ organizationId }: { organizationId: string }) {
  const [subdomains, setSubdomains] = useState<Asset[]>([])
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

  // 处理添加子域名
  const handleAddSubdomain = () => {
    toast.info("添加子域名功能开发中")
  }

  // 创建列定义
  const subdomainColumns = useMemo(
    () =>
      createSubdomainColumns({
        formatDate,
        navigate,
        handleEdit: handleEditAsset,
        handleDelete: handleDeleteAsset,
      }),
    []
  )

  // 获取子域名数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // 模拟获取子域名数据
        const mockSubdomains: Asset[] = [
          {
            id: 4,
            name: "api.example.com",
            type: "域名",
            status: "活跃",
            ip: "192.168.1.103",
            domain: "api.example.com",
            createdAt: "2024-01-18T08:45:00Z",
            updatedAt: "2024-03-17T12:15:00Z",
          },
          {
            id: 5,
            name: "admin.example.com",
            type: "域名",
            status: "活跃",
            ip: "192.168.1.104",
            domain: "admin.example.com",
            createdAt: "2024-01-19T14:20:00Z",
            updatedAt: "2024-03-16T10:45:00Z",
          },
          {
            id: 6,
            name: "test.example.com",
            type: "域名",
            status: "非活跃",
            ip: "192.168.1.105",
            domain: "test.example.com",
            createdAt: "2024-01-20T16:30:00Z",
            updatedAt: "2024-03-15T09:20:00Z",
          },
        ]

        // 模拟API延迟
        await new Promise((resolve) => setTimeout(resolve, 500))

        setSubdomains(mockSubdomains)
      } catch (error) {
        console.error("获取子域名数据失败:", error)
        toast.error("获取子域名数据失败")
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
        <span className="ml-2 text-muted-foreground">加载子域名数据中...</span>
      </div>
    )
  }

  return (
    <SubdomainsDataTable
      data={subdomains}
      columns={subdomainColumns}
      onAddNew={handleAddSubdomain}
      onBulkDelete={handleBulkDelete}
      onSelectionChange={setSelectedAssets}
      searchPlaceholder="搜索子域名..."
      searchColumn="domain"
      addButtonText="添加子域名"
    />
  )
}
