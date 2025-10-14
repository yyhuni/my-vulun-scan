"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { SubdomainsDataTable } from "./subdomains-data-table"
import { createSubdomainColumns } from "./subdomains-columns"
import { AddSubdomainDialog } from "./add-subdomain-dialog"
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
import { useSubdomains, useDeleteSubdomain, useBatchDeleteSubdomains } from "@/hooks/use-subdomains"
import { useOrganizationDomains } from "@/hooks/use-organizations"
import { useDomain } from "@/hooks/use-domains"
import type { SubDomain } from "@/types/subdomain.types"

/**
 * 子域名列表组件（使用 React Query）
 * 用于显示和管理子域名列表
 * 支持通过组织ID或域名ID获取数据
 */
export function SubdomainsList({ 
  organizationId, 
  domainId 
}: { 
  organizationId?: string
  domainId?: string 
}) {
  const [selectedSubdomains, setSelectedSubdomains] = useState<SubDomain[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subdomainToDelete, setSubdomainToDelete] = useState<SubDomain | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  
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
    domainId,
    page: pagination.pageIndex + 1, // 转换为 1-based
    pageSize: pagination.pageSize,
    sortBy: "updated_at", // 直接使用数据库字段名，避免混淆
    sortOrder: "desc"
  })

  // 如果是通过 domainId 访问，需要先获取域名信息来提取 organizationId
  // 注意：useDomain 内部有 enabled: !!id 的条件，所以传 0 时不会发起请求
  const { data: domainData } = useDomain(
    domainId && !organizationId ? parseInt(domainId) : 0
  )

  // 从域名数据中提取 organizationId（取第一个关联的组织）
  const effectiveOrganizationId = organizationId || 
    (domainData?.organizations && domainData.organizations.length > 0 
      ? domainData.organizations[0].id.toString() 
      : undefined)

  // 获取组织的域名列表（用于添加/编辑子域名时选择所属域名）
  // 只在通过 organizationId 访问时才获取
  const { data: domainsData } = useOrganizationDomains(
    effectiveOrganizationId ? parseInt(effectiveOrganizationId) : 0, 
    {
      page: 1,
      pageSize: 1000, // 获取所有域名
      sortBy: "name",
      sortOrder: "asc"
    },
    {
      enabled: !!effectiveOrganizationId // 只有当有有效的 organizationId 时才启用
    }
  )

  // Mutations
  const deleteSubdomain = useDeleteSubdomain()
  const batchDeleteSubdomains = useBatchDeleteSubdomains()

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

  // 处理删除子域名
  const handleDeleteSubdomain = (subdomain: SubDomain) => {
    setSubdomainToDelete(subdomain)
    setDeleteDialogOpen(true)
  }

  // 确认删除子域名
  const confirmDelete = async () => {
    if (!subdomainToDelete) return

    setDeleteDialogOpen(false)
    setSubdomainToDelete(null)
    
    // 使用 React Query 的删除 mutation
    deleteSubdomain.mutate(subdomainToDelete.id)
  }

  // 处理批量删除
  const handleBulkDelete = () => {
    if (selectedSubdomains.length === 0) {
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  // 确认批量删除
  const confirmBulkDelete = async () => {
    if (selectedSubdomains.length === 0) return

    const deletedIds = selectedSubdomains.map(subdomain => subdomain.id)
    
    setBulkDeleteDialogOpen(false)
    setSelectedSubdomains([])
    
    // 使用 React Query 的批量删除 mutation
    batchDeleteSubdomains.mutate(deletedIds)
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
        handleDelete: handleDeleteSubdomain,
      }),
    [formatDate, navigate, handleDeleteSubdomain]
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
      
      {/* 添加子域名对话框 - 只在通过 domainId 访问时显示 */}
      {domainId && domainData && (
        <AddSubdomainDialog
          domainId={domainId}
          domainName={domainData.name}
          onAdd={handleAddSuccess}
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
        />
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除子域名 "{subdomainToDelete?.name}" 及其相关数据（包括关联的 Endpoints 和 Vulnerabilities）。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSubdomain.isPending}
            >
              {deleteSubdomain.isPending ? (
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
              此操作无法撤销。这将永久删除以下 {selectedSubdomains.length} 个子域名及其相关数据（包括关联的 Endpoints 和 Vulnerabilities）。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 p-2 bg-muted rounded-md max-h-60 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedSubdomains.map((subdomain) => (
                <li key={subdomain.id} className="flex items-center">
                  <span className="font-medium font-mono">{subdomain.name}</span>
                  {subdomain.domain && (
                    <span className="ml-2 text-muted-foreground">- {subdomain.domain.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={batchDeleteSubdomains.isPending}
            >
              {batchDeleteSubdomains.isPending ? (
                <>
                  <LoadingSpinner/>
                  删除中...
                </>
              ) : (
                `删除 ${selectedSubdomains.length} 个子域名`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
