"use client"

import React, { useState, useMemo } from "react"
import { SubdomainsDataTable } from "./subdomains-data-table"
import { createSubdomainColumns } from "./subdomains-columns"
import { LoadingState } from "@/components/ui/loading-spinner"
import { useSubdomains } from "@/hooks/use-subdomains"
import type { SubDomain } from "@/types/subdomain.types"

/**
 * 子域名列表组件（使用 React Query）
 * 用于显示和管理子域名列表
 */
export function SubdomainsList({ organizationId }: { organizationId: string }) {
  const [selectedSubdomains, setSelectedSubdomains] = useState<SubDomain[]>([])
  
  // 分页状态
  const [pagination, setPagination] = useState({
    pageIndex: 0,  // 0-based for react-table
    pageSize: 10,
  })

  // 使用 React Query 获取子域名数据
  const {
    data,
    isLoading,
    error,
    refetch
  } = useSubdomains({
    organizationId,
    page: pagination.pageIndex + 1, // 转换为 1-based
    pageSize: pagination.pageSize,
    sortBy: "updatedAt",
    sortOrder: "desc"
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

  // 处理编辑子域名
  const handleEditSubdomain = (subdomain: SubDomain) => {
    // TODO: 实现编辑功能
    console.info(`编辑子域名功能开发中: ${subdomain.name}`)
  }

  // 处理删除子域名
  const handleDeleteSubdomain = (subdomain: SubDomain) => {
    // TODO: 实现删除功能
    console.info(`删除子域名功能开发中: ${subdomain.name}`)
  }

  // 处理批量删除
  const handleBulkDelete = () => {
    if (selectedSubdomains.length === 0) {
      return
    }
    // TODO: 实现批量删除功能
    console.info(`批量删除功能开发中，选中 ${selectedSubdomains.length} 个子域名`)
  }

  // 处理分页变化
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }

  // 创建列定义
  const subdomainColumns = useMemo(
    () =>
      createSubdomainColumns({
        formatDate,
        navigate,
        handleEdit: handleEditSubdomain,
        handleDelete: handleDeleteSubdomain,
      }),
    [formatDate, navigate, handleEditSubdomain, handleDeleteSubdomain]
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
          {error.message || "加载子域名数据时出现错误，请重试"}
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
    return <LoadingState message="加载子域名数据中..." />
  }

  // 空数据状态
  if (!data?.subDomains || data.subDomains.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-3 mb-4">
          <span className="text-muted-foreground">🌐</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">暂无子域名</h3>
        <p className="text-muted-foreground text-center mb-4">
          该组织还没有任何子域名数据
        </p>
      </div>
    )
  }

  return (
    <SubdomainsDataTable
      data={data.subDomains}
      columns={subdomainColumns}
      onBulkDelete={handleBulkDelete}
      onSelectionChange={setSelectedSubdomains}
      searchPlaceholder="搜索子域名..."
      searchColumn="name"
      pagination={pagination}
      setPagination={setPagination}
      paginationInfo={{
        total: data.total || 0,
        page: data.page || 1,
        pageSize: data.pageSize || 10,
        totalPages: Math.ceil((data.total || 0) / (data.pageSize || 10)),
      }}
      onPaginationChange={handlePaginationChange}
    />
  )
}
