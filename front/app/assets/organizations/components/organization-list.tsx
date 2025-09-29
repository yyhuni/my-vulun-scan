// 组织列表组件
"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { Trash2, Plus } from "lucide-react"

// 导航 Hook
import { useNavigation } from "@/hooks/use-navigation"

// 第三方库和 API 客户端
import { getErrorMessage } from "@/lib/api-client"
import { OrganizationService } from "@/services/organization.service"

// UI 组件库
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


// 数据表格组件
import { DataTable } from "@/components/custom-ui/data-table/data-table"
import { createOrganizationColumns, Organization } from "./organization-columns"

// 业务组件
import AddOrganizationDialog from "./add-organization-dialog"
import EditOrganizationDialog from "./edit-organization-dialog"


type ViewState = "loading" | "data" | "empty" | "error"

export default function OrganizationList() {
  // 状态管理
  const [viewState, setViewState] = useState<ViewState>("loading")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [organizationToDelete, setOrganizationToDelete] = useState<Organization | null>(null)
  const [organizationToEdit, setOrganizationToEdit] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedCount, setSelectedCount] = useState(0)
  const tableRef = useRef<any>(null)

  const { navigate } = useNavigation()

  // 辅助函数
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

  const handleDelete = (org: Organization) => {
    setOrganizationToDelete(org)
    setDeleteDialogOpen(true)
  }

  const handleEdit = (org: Organization) => {
    setOrganizationToEdit(org)
    setEditDialogOpen(true)
  }

  // 创建列定义
  const columns = useMemo(() =>
    createOrganizationColumns({ formatDate, navigate, handleEdit, handleDelete }),
    [navigate]
  )

  // 初始化时加载组织数据
  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      setViewState("loading")
      setError(null)

      // 使用组织服务
      const response = await OrganizationService.getOrganizations()

      // 检查响应码并获取数据
      if (response.code === "200" && Array.isArray(response.data)) {
        // 数据已经自动转换为 camelCase，无需手动转换
        setOrganizations(response.data)
        setViewState(response.data.length > 0 ? "data" : "empty")
      } else {
        throw new Error("API 返回了无效的数据格式")
      }
    } catch (err: any) {
      console.error('Error fetching organizations:', err)
      setError(getErrorMessage(err))
      setViewState("error")
    }
  }

  // 删除组织
  const confirmDelete = async () => {
    if (!organizationToDelete) return

    try {
      await OrganizationService.deleteOrganization(organizationToDelete.id)
      setOrganizations((prev) => prev.filter((org) => org.id !== organizationToDelete.id))
      setDeleteDialogOpen(false)
      setOrganizationToDelete(null)
    } catch (err: any) {
      console.error('Error deleting organization:', err)
    }
  }

  // 添加组织
  const handleOrganizationAdded = () => {
    fetchOrganizations()
  }

  // 编辑组织
  const handleOrganizationEdited = (updatedOrganization: Organization) => {
    setOrganizations((prev) =>
      prev.map((org) =>
        org.id === updatedOrganization.id ? updatedOrganization : org
      )
    )
    setEditDialogOpen(false)
    setOrganizationToEdit(null)
  }

  // 批量删除处理函数
  const handleBulkDelete = () => {
    if (selectedCount === 0) {
      return
    }

    // 这里可以实现批量删除逻辑
  }

  // 根据状态渲染内容
  const renderContent = () => {
    if (viewState === "loading") {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">Loading organizations...</span>
        </div>
      )
    }

    if (viewState === "error") {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-destructive/10 p-3 mb-4">
            <Trash2 className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Error</h3>
          <p className="text-muted-foreground text-center mb-4">
            {error || "There was an error loading organizations. Please try again."}
          </p>
          <Button variant="outline" onClick={fetchOrganizations}>
            Try again
          </Button>
        </div>
      )
    }

    return (
      <DataTable
        columns={columns}
        data={organizations}
        searchableColumns={['name', 'description']}
        extraButtons={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              disabled={selectedCount === 0}
              className={selectedCount === 0 ? "text-muted-foreground" : "text-destructive hover:text-destructive"}
            >
              <Trash2  />
              批量删除
            </Button>
            <AddOrganizationDialog onAdd={handleOrganizationAdded} />
          </div>
        }
        onSelectionChange={(count) => setSelectedCount(count)}
      />
    )
  }

  return (
    <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
      {/* 页面头部 */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Organizations</h2>
          <p className="text-muted-foreground">
            Manage and view all organizations in the system
          </p>
        </div>
      </div>

      {/* 主要内容 */}
      {renderContent()}

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the organization "{organizationToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
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
