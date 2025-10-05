"use client"

import React, { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { MainAssetsDataTable } from "./main-assets-data-table"
import { createMainAssetColumns } from "./main-assets-columns"
import { AddDomainDialog } from "./add-domain-dialog"
import type { Asset } from "@/types/asset.types"

/**
 * 主资产列表组件
 * 用于显示和管理主资产列表
 */
export function MainAssetsList({ organizationId }: { organizationId: string }) {
  const [mainAssets, setMainAssets] = useState<Asset[]>([])
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

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

  // 处理添加主资产
  const handleAddMainAsset = () => {
    setIsAddDialogOpen(true)
  }

  // 处理添加成功
  const handleAddSuccess = (newDomains: Asset[]) => {
    // 乐观更新：立即添加到列表
    setMainAssets(prev => [...newDomains, ...prev])
    toast.success(`成功添加 ${newDomains.length} 个域名`)
  }

  // 创建列定义
  const mainAssetColumns = useMemo(
    () =>
      createMainAssetColumns({
        formatDate,
        navigate,
        handleEdit: handleEditAsset,
        handleDelete: handleDeleteAsset,
      }),
    []
  )

  // 获取主资产数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // 模拟获取主资产数据
        const mockMainAssets: Asset[] = [
          {
            id: 1,
            name: "example.com",
            description: "主域名 - 公司官网",
            createdAt: "2024-01-15T10:30:00Z",
            updatedAt: "2024-03-20T14:45:00Z",
          },
          {
            id: 2,
            name: "api.example.com",
            description: "API服务域名",
            createdAt: "2024-01-16T09:15:00Z",
            updatedAt: "2024-03-19T16:20:00Z",
          },
          {
            id: 3,
            name: "test.example.com",
            description: "测试环境域名",
            createdAt: "2024-01-17T11:00:00Z",
            updatedAt: "2024-03-18T13:30:00Z",
          },
        ]

        // 模拟API延迟
        await new Promise((resolve) => setTimeout(resolve, 500))

        setMainAssets(mockMainAssets)
      } catch (error) {
        console.error("获取主资产数据失败:", error)
        toast.error("获取主资产数据失败")
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
        <span className="ml-2 text-muted-foreground">加载主资产数据中...</span>
      </div>
    )
  }

  return (
    <>
      <MainAssetsDataTable
        data={mainAssets}
        columns={mainAssetColumns}
        onAddNew={handleAddMainAsset}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={setSelectedAssets}
        searchPlaceholder="搜索主资产..."
        searchColumn="name"
        addButtonText="添加主资产"
      />
      
      {/* 添加域名对话框 */}
      <AddDomainDialog
        organizationId={organizationId}
        onAdd={handleAddSuccess}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </>
  )
}
