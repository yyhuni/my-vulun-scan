"use client"

import React, { useState, useMemo } from "react"
import { SubdomainsDataTable } from "./subdomains-data-table"
import { createSubdomainColumns } from "./subdomains-columns"
import { AddSubdomainDialog } from "./add-subdomain-dialog"
import { EditSubdomainDialog } from "./edit-subdomain-dialog"
import { LoadingState } from "@/components/loading-spinner"
import { useSubdomains } from "@/hooks/use-subdomains"
import { useOrganizationDomains } from "@/hooks/use-organizations"
import type { SubDomain } from "@/types/subdomain.types"

/**
 * 子域名列表组件（使用 React Query）
 * 用于显示和管理子域名列表
 */
export function SubdomainsList({ organizationId }: { organizationId: string }) {
  const [selectedSubdomains, setSelectedSubdomains] = useState<SubDomain[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingSubdomain, setEditingSubdomain] = useState<SubDomain | null>(null)
  
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
    sortBy: "updated_at", // 直接使用数据库字段名，避免混淆
    sortOrder: "desc"
  })

  // 获取组织的域名列表（用于添加/编辑子域名时选择所属域名）
  const { data: domainsData } = useOrganizationDomains(parseInt(organizationId), {
    page: 1,
    pageSize: 1000, // 获取所有域名
    sortBy: "name",
    sortOrder: "asc"
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
    setEditingSubdomain(subdomain)
    setIsEditDialogOpen(true)
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

  // 处理添加子域名
  const handleAddSubdomain = () => {
    setIsAddDialogOpen(true)
  }

  // 处理添加成功
  const handleAddSuccess = async (newSubdomains: SubDomain[]) => {
    // React Query 会自动刷新数据，不需要手动处理
    setIsAddDialogOpen(false)
  }

  // 处理编辑成功
  const handleEditSuccess = async (updatedSubdomain: SubDomain) => {
    // React Query 会自动刷新数据，不需要手动处理
    setIsEditDialogOpen(false)
    setEditingSubdomain(null)
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

  return (
    <>
      <SubdomainsDataTable
        data={data?.subDomains || []}
        columns={subdomainColumns}
        onAddNew={handleAddSubdomain}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={setSelectedSubdomains}
        searchPlaceholder="搜索子域名..."
        searchColumn="name"
        addButtonText="添加子域名"
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={{
          total: data?.total || 0,
          page: data?.page || 1,
          pageSize: data?.pageSize || 10,
          totalPages: Math.ceil((data?.total || 0) / (data?.pageSize || 10)),
        }}
        onPaginationChange={handlePaginationChange}
      />
      
      {/* 添加子域名对话框 */}
      <AddSubdomainDialog
        organizationId={organizationId}
        domains={domainsData?.domains || []}
        onAdd={handleAddSuccess}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
      
      {/* 编辑子域名对话框 */}
      {editingSubdomain && (
        <EditSubdomainDialog
          subdomain={editingSubdomain}
          domains={domainsData?.domains || []}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onEdit={handleEditSuccess}
        />
      )}
    </>
  )
}
