"use client" // 标记为客户端组件，可以使用浏览器 API 和交互功能

// 导入 React 核心库和 Hooks
import React, { useState, useEffect, useMemo } from "react"
// 导入图标组件
import { Trash2, Plus, Building2 } from "lucide-react"
// 导入提示组件
import { toast } from "sonner"

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

// 导入数据表格组件
import { OrganizationDataTable } from "./organization-data-table"
import { createOrganizationColumns } from "./organization-columns"

// 导入业务组件
import { AddOrganizationDialog } from "./add-organization-dialog"
import { EditOrganizationDialog } from "./edit-organization-dialog"
// 导入API服务
import { OrganizationService } from "@/services/organization.service"

// 导入类型定义
interface Organization {
  id: number
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

// 添加分页信息接口
interface PaginationInfo {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type ViewState = "loading" | "data" | "empty" | "error"

/**
 * 组织列表组件
 * 显示组织数据表格，支持增删改查操作
 * 
 * 功能特性：
 * 1. 组织数据的展示和管理
 * 2. 支持添加、编辑、删除组织
 * 3. 支持批量操作
 * 4. 响应式设计
 * 5. 错误处理和加载状态
 */
export function OrganizationList() {
  // 状态管理
  const [viewState, setViewState] = useState<ViewState>("loading")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [organizationToDelete, setOrganizationToDelete] = useState<Organization | null>(null)
  const [organizationToEdit, setOrganizationToEdit] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedOrganizations, setSelectedOrganizations] = useState<Organization[]>([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isPaginationLoading, setIsPaginationLoading] = useState(false) // 分页加载状态
  
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
    // 这里可以使用 Next.js 的路由或自定义导航逻辑
    window.location.href = path
  }

  // 创建列定义
  const columns = useMemo(() =>
    createOrganizationColumns({ formatDate, navigate, handleEdit, handleDelete }),
    []
  )

  // 初始化时加载组织数据
  useEffect(() => {
    fetchOrganizations(undefined, undefined, true) // 标记为初始加载
  }, [])

  // 获取组织数据 - 修改为支持分页参数
  const fetchOrganizations = async (page?: number, pageSize?: number, isInitialLoad = false) => {
    try {
      // 只在初始加载时设置loading状态，分页时使用独立的加载状态
      if (isInitialLoad) {
        setViewState("loading")
      } else {
        setIsPaginationLoading(true)
      }
      setError(null)

      // 使用传入的参数或当前分页状态
      const currentPage = page ?? pagination.pageIndex + 1  // 转换为1-based
      const currentPageSize = pageSize ?? pagination.pageSize

      // 调用真实API获取组织列表，传递分页参数
      const response = await OrganizationService.getOrganizations({
        page: currentPage,
        pageSize: currentPageSize
      })
      
      if (response.state === "success" && response.data) {
        const organizations = response.data.organizations || []
        setOrganizations(organizations)
        
        // 更新分页信息
        setPaginationInfo({
          total: response.data.total || 0,
          page: response.data.page || 1,
          pageSize: (response.data as any).page_size || response.data.pageSize || 10,
          totalPages: (response.data as any).total_pages || response.data.totalPages || 0,
        })
        
        setViewState(organizations.length > 0 ? "data" : "empty")
      } else {
        throw new Error(response.message || "获取组织列表失败")
      }
    } catch (err: any) {
      console.error('Error fetching organizations:', err)
      const errorMessage = err.message || "获取组织列表失败"
      setError(errorMessage)
      if (isInitialLoad) {
        setViewState("error")
      }
      toast.error(`获取组织列表失败: ${errorMessage}`)
    } finally {
      setIsPaginationLoading(false)
    }
  }

  // 确认删除组织
  const confirmDelete = async () => {
    if (!organizationToDelete) return

    try {
      // 模拟 API 删除调用
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setOrganizations((prev) => prev.filter((org) => org.id !== organizationToDelete.id))
      toast.success(`组织 "${organizationToDelete.name}" 已成功删除`)
      setDeleteDialogOpen(false)
      setOrganizationToDelete(null)
    } catch (err: any) {
      console.error('Error deleting organization:', err)
      toast.error(`删除组织失败: ${err.message || "未知错误"}`)
    }
  }

  // 添加组织成功回调
  const handleOrganizationAdded = (newOrganization: Organization) => {
    // 重新获取组织列表以确保数据同步
    fetchOrganizations()
    toast.success(`组织 "${newOrganization.name}" 已成功添加`)
  }

  // 编辑组织成功回调
  const handleOrganizationEdited = (updatedOrganization: Organization) => {
    setOrganizations((prev) =>
      prev.map((org) =>
        org.id === updatedOrganization.id ? updatedOrganization : org
      )
    )
    toast.success(`组织 "${updatedOrganization.name}" 已成功更新`)
    setEditDialogOpen(false)
    setOrganizationToEdit(null)
  }

  // 批量删除处理函数
  const handleBulkDelete = () => {
    if (selectedOrganizations.length === 0) {
      toast.error("请先选择要删除的组织")
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  // 确认批量删除
  const confirmBulkDelete = async () => {
    if (selectedOrganizations.length === 0) return

    try {
      // 模拟 API 批量删除调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const deletedIds = selectedOrganizations.map(org => org.id)
      const deletedNames = selectedOrganizations.map(org => org.name)
      
      setOrganizations((prev) => prev.filter((org) => !deletedIds.includes(org.id)))
      
      toast.success(`成功删除 ${selectedOrganizations.length} 个组织: ${deletedNames.join(", ")}`)
      setBulkDeleteDialogOpen(false)
      setSelectedOrganizations([])
    } catch (err: any) {
      console.error('Error bulk deleting organizations:', err)
      toast.error(`批量删除组织失败: ${err.message || "未知错误"}`)
    }
  }

  // 根据状态渲染内容
  const renderContent = () => {
    if (viewState === "loading") {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">加载组织数据中...</span>
        </div>
      )
    }

    if (viewState === "error") {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-destructive/10 p-3 mb-4">
            <Trash2 className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">加载失败</h3>
          <p className="text-muted-foreground text-center mb-4">
            {error || "加载组织数据时出现错误，请重试"}
          </p>
          <Button variant="outline" onClick={() => fetchOrganizations()}>
            重新加载
          </Button>
        </div>
      )
    }

    if (viewState === "empty") {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">暂无组织</h3>
          <p className="text-muted-foreground text-center mb-4">
            系统中还没有任何组织，点击下方按钮添加第一个组织
          </p>
          <AddOrganizationDialog onAdd={handleOrganizationAdded} />
        </div>
      )
    }

    return (
      <OrganizationDataTable
        data={organizations}
        columns={columns}
        onAddNew={() => setAddDialogOpen(true)}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={setSelectedOrganizations}
        searchPlaceholder="搜索组织名称或描述..."
        searchColumn="name"
        // 添加分页相关属性
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={paginationInfo}
        isPaginationLoading={isPaginationLoading}
        onPaginationChange={(newPagination: { pageIndex: number; pageSize: number }) => {
          setPagination(newPagination)
          fetchOrganizations(newPagination.pageIndex + 1, newPagination.pageSize)
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* 主要内容 */}
      {renderContent()}

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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
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
              此操作无法撤销。这将永久删除以下 {selectedOrganizations.length} 个组织及其相关数据：
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
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除 {selectedOrganizations.length} 个组织
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 添加组织对话框 */}
      <AddOrganizationDialog 
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleOrganizationAdded} 
      />
    </div>
  )
}
