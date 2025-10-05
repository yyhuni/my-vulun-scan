"use client"

import React, { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { MainAssetsDataTable } from "./main-assets-data-table"
import { createMainAssetColumns } from "./main-assets-columns"
import { AddDomainDialog } from "./add-domain-dialog"
import { DomainService } from "@/services/domain.service"
import type { Asset } from "@/types/asset.types"
import type { PaginationInfo } from "@/types/common.types"

/**
 * 主资产列表组件
 * 用于显示和管理主资产列表
 */
export function MainAssetsList({ organizationId }: { organizationId: string }) {
  const [mainAssets, setMainAssets] = useState<Asset[]>([])
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  
  // 添加分页状态
  const [pagination, setPagination] = useState({
    pageIndex: 0,  // 0-based for react-table
    pageSize: 10,
  })
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
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

  // 刷新数据
  const refreshData = async (page?: number, pageSize?: number) => {
    try {
      // 使用传入的参数或当前分页状态
      const currentPage = page ?? pagination.pageIndex + 1  // 转换为1-based
      const currentPageSize = pageSize ?? pagination.pageSize
      
      const response = await DomainService.getDomainsByOrgId({
        organizationId: parseInt(organizationId),
        page: currentPage,
        pageSize: currentPageSize,
        sortBy: "updated_at",
        sortOrder: "desc"
      })
      
      if (response.state === "success" && response.data) {
        setMainAssets(response.data.domains || [])
        
        // 更新分页信息
        setPaginationInfo({
          total: response.data.total || 0,
          page: response.data.page || 1,
          pageSize: response.data.page_size || 10,
          totalPages: response.data.total_pages || 0,
        })
      }
    } catch (error: any) {
      console.error("刷新数据失败:", error)
      toast.error(`刷新数据失败: ${error.message || "未知错误"}`)
    }
  }

  // 处理添加主资产
  const handleAddMainAsset = () => {
    setIsAddDialogOpen(true)
  }

  // 处理添加成功
  const handleAddSuccess = async (newDomains: Asset[]) => {
    // 等待响应方案：重新获取数据（不使用乐观更新）
    await refreshData()
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

        // 调用后端 API 获取域名列表
        const response = await DomainService.getDomainsByOrgId({
          organizationId: parseInt(organizationId),
          page: 1,
          pageSize: 10,
          sortBy: "updated_at",
          sortOrder: "desc"
        })
        
        if (response.state === "success" && response.data) {
          setMainAssets(response.data.domains || [])
          
          // 更新分页信息
          setPaginationInfo({
            total: response.data.total || 0,
            page: response.data.page || 1,
            pageSize: response.data.page_size || 10,
            totalPages: response.data.total_pages || 0,
          })
        } else {
          throw new Error(response.message || "获取域名列表失败")
        }
      } catch (error: any) {
        console.error("获取主资产数据失败:", error)
        toast.error(`获取主资产数据失败: ${error.message || "未知错误"}`)
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
        // 添加分页相关属性
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={paginationInfo}
        onPaginationChange={(newPagination: { pageIndex: number; pageSize: number }) => {
          setPagination(newPagination)
          refreshData(newPagination.pageIndex + 1, newPagination.pageSize)
        }}
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
