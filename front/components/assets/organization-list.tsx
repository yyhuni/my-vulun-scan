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
import { DataTable } from "@/components/data-table"
import { createOrganizationColumns } from "./organization-columns"

// 导入业务组件
import { AddOrganizationDialog } from "./add-organization-dialog"
import { EditOrganizationDialog } from "./edit-organization-dialog"

// 导入类型定义
interface Organization {
  id: number
  name: string
  description: string
  createdAt: string
  updatedAt: string
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
  const [organizationToDelete, setOrganizationToDelete] = useState<Organization | null>(null)
  const [organizationToEdit, setOrganizationToEdit] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedCount, setSelectedCount] = useState(0)

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
    fetchOrganizations()
  }, [])

  // 获取组织数据
  const fetchOrganizations = async () => {
    try {
      setViewState("loading")
      setError(null)

      // 模拟 API 调用 - 实际项目中替换为真实的 API 调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模拟数据
      const mockData: Organization[] = [
        {
          id: 1,
          name: "技术部",
          description: "负责公司技术研发和系统维护",
          createdAt: "2024-01-15T10:30:00Z",
          updatedAt: "2024-03-20T14:45:00Z"
        },
        {
          id: 2,
          name: "市场部",
          description: "负责市场推广和客户关系维护",
          createdAt: "2024-01-20T09:15:00Z",
          updatedAt: "2024-02-28T16:20:00Z"
        },
        {
          id: 3,
          name: "人事部",
          description: "负责人力资源管理和招聘",
          createdAt: "2024-02-01T11:00:00Z",
          updatedAt: "2024-03-15T13:30:00Z"
        }
      ]

      setOrganizations(mockData)
      setViewState(mockData.length > 0 ? "data" : "empty")
    } catch (err: any) {
      console.error('Error fetching organizations:', err)
      const errorMessage = err.message || "获取组织列表失败"
      setError(errorMessage)
      setViewState("error")
      toast.error(`获取组织列表失败: ${errorMessage}`)
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
    setOrganizations((prev) => [...prev, newOrganization])
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
    toast.info("批量删除功能即将上线，请使用单个删除功能")
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
          <Button variant="outline" onClick={fetchOrganizations}>
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
      <DataTable
        columns={columns}
        data={organizations}
        // 可搜索的列
        searchableColumns={['name', 'description']}
        // 额外的操作按钮
        extraButtons={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              disabled={selectedCount === 0}
              className={selectedCount === 0 ? "text-muted-foreground" : "text-destructive hover:text-destructive"}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              批量删除 ({selectedCount})
            </Button>
            <AddOrganizationDialog onAdd={handleOrganizationAdded} />
          </div>
        }
        // 选择变化回调
        onSelectionChange={(count: number) => setSelectedCount(count)}
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
    </div>
  )
}
