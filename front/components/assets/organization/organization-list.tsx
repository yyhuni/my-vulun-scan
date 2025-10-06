"use client"

import React, { useState, useMemo } from "react"
import { Trash2, Plus, Building2 } from "lucide-react"

// 导入 UI 组件
import { Button } from "@/components/ui/button"
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
import { LoadingState, LoadingSpinner } from "@/components/loading-spinner"

// 导入数据表格组件
import { OrganizationDataTable } from "./organization-data-table"
import { createOrganizationColumns } from "./organization-columns"

// 导入业务组件
import { AddOrganizationDialog } from "./add-organization-dialog"
import { EditOrganizationDialog } from "./edit-organization-dialog"

// 导入 React Query Hooks
import {
  useOrganizations,
  useDeleteOrganization,
  useBatchDeleteOrganizations,
  useUpdateOrganization,
} from "@/hooks/use-organizations"

// 导入类型定义
import type { Organization } from "@/types/organization.types"

/**
 * 组织列表组件（使用 React Query）
 * 
 * 功能特性：
 * 1. 统一的 Loading 状态管理
 * 2. 自动缓存和重新验证
 * 3. 乐观更新
 * 4. 自动错误处理
 * 5. 更好的用户体验
 */
export function OrganizationList() {
  // 状态管理
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [organizationToDelete, setOrganizationToDelete] = useState<Organization | null>(null)
  const [organizationToEdit, setOrganizationToEdit] = useState<Organization | null>(null)
  const [selectedOrganizations, setSelectedOrganizations] = useState<Organization[]>([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  
  // 分页状态
  const [pagination, setPagination] = useState({
    pageIndex: 0,  // 0-based for react-table
    pageSize: 10,
  })

  // 使用 React Query 获取组织数据
  const {
    data,
    isLoading,
    error,
    refetch
  } = useOrganizations({
    page: pagination.pageIndex + 1, // 转换为 1-based
    pageSize: pagination.pageSize,
    sortBy: "updatedAt",
    sortOrder: "desc"
  })

  // Mutations
  const deleteOrganization = useDeleteOrganization()
  const batchDeleteOrganizations = useBatchDeleteOrganizations()
  const updateOrganization = useUpdateOrganization()

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

  // 处理删除操作
  const handleDelete = (org: Organization) => {
    setOrganizationToDelete(org)
    setDeleteDialogOpen(true)
  }

  // 处理编辑操作
  const handleEdit = (org: Organization) => {
    setOrganizationToEdit(org)
    setEditDialogOpen(true)
  }

  // 导航到详情页面
  const navigate = (path: string) => {
    window.location.href = path
  }

  // 创建列定义
  const columns = useMemo(() =>
    createOrganizationColumns({ formatDate, navigate, handleEdit, handleDelete }),
    [formatDate, navigate, handleEdit, handleDelete]
  )

  // 确认删除组织
  const confirmDelete = async () => {
    if (!organizationToDelete) return

    setDeleteDialogOpen(false)
    setOrganizationToDelete(null)
    
    // 使用 React Query 的删除 mutation（自动乐观更新）
    deleteOrganization.mutate(Number(organizationToDelete.id))
  }

  // 编辑组织成功回调
  const handleOrganizationEdited = (updatedOrganization: Organization) => {
    // 使用 React Query 的更新 mutation
    updateOrganization.mutate({
      id: Number(updatedOrganization.id),
      data: {
        name: updatedOrganization.name,
        description: updatedOrganization.description
      }
    })
    
    setEditDialogOpen(false)
    setOrganizationToEdit(null)
  }

  // 批量删除处理函数
  const handleBulkDelete = () => {
    if (selectedOrganizations.length === 0) {
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  // 确认批量删除
  const confirmBulkDelete = async () => {
    if (selectedOrganizations.length === 0) return

    const deletedIds = selectedOrganizations.map(org => Number(org.id))
    
    setBulkDeleteDialogOpen(false)
    setSelectedOrganizations([])
    
    // 使用 React Query 的批量删除 mutation（自动乐观更新）
    batchDeleteOrganizations.mutate(deletedIds)
  }

  // 处理分页变化
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <Trash2 className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">加载失败</h3>
        <p className="text-muted-foreground text-center mb-4">
          {error.message || "加载组织数据时出现错误，请重试"}
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          重新加载
        </Button>
      </div>
    )
  }

  // 加载状态
  if (isLoading) {
    return <LoadingState message="加载组织数据中..." />
  }

  // 空数据状态
  if (!data?.organizations || data.organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">暂无组织</h3>
        <p className="text-muted-foreground text-center mb-4">
          系统中还没有任何组织，点击下方按钮添加第一个组织
        </p>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          添加组织
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 主要内容 */}
      <OrganizationDataTable
        data={data.organizations}
        columns={columns}
        onAddNew={() => setAddDialogOpen(true)}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={setSelectedOrganizations}
        searchPlaceholder="搜索组织名称或描述..."
        searchColumn="name"
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={data.pagination}
        onPaginationChange={handlePaginationChange}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除组织 "{organizationToDelete?.name}" 及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteOrganization.isPending}
            >
              {deleteOrganization.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  删除中...
                </>
              ) : (
                "删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑组织对话框 */}
      {organizationToEdit && (
        <EditOrganizationDialog
          organization={organizationToEdit}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onEdit={handleOrganizationEdited}
        />
      )}

      {/* 批量删除确认对话框 */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除以下 {selectedOrganizations.length} 个组织及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 p-2 bg-muted rounded-md">
            <ul className="text-sm space-y-1">
              {selectedOrganizations.map((org) => (
                <li key={org.id} className="flex items-center">
                  <span className="font-medium">{org.name}</span>
                  {org.description && (
                    <span className="ml-2 text-muted-foreground">- {org.description}</span>
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
              disabled={batchDeleteOrganizations.isPending}
            >
              {batchDeleteOrganizations.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  删除中...
                </>
              ) : (
                `删除 ${selectedOrganizations.length} 个组织`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 添加组织对话框 */}
      <AddOrganizationDialog 
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={() => {
          // React Query 会自动刷新数据，不需要手动处理
          setAddDialogOpen(false)
        }} 
      />
    </div>
  )
}
