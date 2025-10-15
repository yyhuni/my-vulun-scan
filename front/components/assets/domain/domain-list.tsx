"use client"

import React, { useState, useMemo, useCallback } from "react"
import { Trash2 } from "lucide-react"
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
import { LoadingState, LoadingSpinner } from "@/components/loading-spinner"

// 导入数据表格组件
import { DomainDataTable } from "./domain-data-table"
import { createDomainColumns } from "./domain-columns"

// 导入业务组件
import { AddDomainDialog } from "./add-domain-dialog"
import { EditDomainDialog } from "./edit-domain-dialog"

// 导入类型定义
import type { Domain } from "@/types/domain.types"

// 导入 hooks
import { 
  useAllDomains,
  useBatchDeleteDomains 
} from "@/hooks/use-domains"

/**
 * 域名列表组件
 * 
 * 功能特性：
 * 1. 显示所有域名列表
 * 2. 支持搜索、排序、分页
 * 3. 支持编辑和删除操作
 * 4. 使用真实后端 API
 */
export function DomainList() {
  // 状态管理
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [domainToDelete, setDomainToDelete] = useState<Domain | null>(null)
  const [domainToEdit, setDomainToEdit] = useState<Domain | null>(null)
  const [selectedDomains, setSelectedDomains] = useState<Domain[]>([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  
  // 分页状态（服务器端分页）
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // 获取域名列表数据
  const { data, isLoading, error } = useAllDomains({
    page: pagination.pageIndex + 1, // 后端从 1 开始计数
    pageSize: pagination.pageSize,
    sortBy: 'updated_at',  // 注意：这里传给后端的参数保持下划线，请求拦截器会处理
    sortOrder: 'desc',
  })

  // 删除 hook（单个和批量删除统一使用批量删除 API）
  const batchDeleteMutation = useBatchDeleteDomains()

  // 辅助函数 - 格式化日期（使用 useCallback 优化）
  const formatDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString)
      // 检查是否为有效日期
      if (isNaN(date.getTime())) {
        return "无效日期"
      }
      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "numeric", 
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    } catch (error) {
      return "无效日期"
    }
  }, [])

  // 处理删除操作（使用 useCallback 优化）
  const handleDelete = useCallback((domain: Domain) => {
    setDomainToDelete(domain)
    setDeleteDialogOpen(true)
  }, [])

  // 处理编辑操作（使用 useCallback 优化）
  const handleEdit = useCallback((domain: Domain) => {
    setDomainToEdit(domain)
    setEditDialogOpen(true)
  }, [])

  // 创建列定义（只在依赖变化时重新创建）
  const columns = useMemo(() =>
    createDomainColumns({ formatDate, handleEdit, handleDelete }),
    [formatDate, handleEdit, handleDelete]
  )

  // 确认删除域名
  const confirmDelete = async () => {
    if (!domainToDelete) return
    
    // 关闭对话框
    setDeleteDialogOpen(false)
    
    // ✅ 直接使用批量删除 API（一次调用完成）
    try {
      await batchDeleteMutation.mutateAsync([domainToDelete.id])
      // mutation hook 内部已经处理了成功提示和刷新
      setDomainToDelete(null)
    } catch (error: any) {
      // mutation hook 内部已经处理了错误提示
      // 失败时不清空状态，让用户可以重试
    }
  }

  // 编辑域名成功回调
  const handleDomainEdited = (updatedDomain: Domain) => {
    setEditDialogOpen(false)
    setDomainToEdit(null)
  }

  // 批量删除处理函数
  const handleBulkDelete = () => {
    if (selectedDomains.length === 0) {
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  // 确认批量删除
  const confirmBulkDelete = async () => {
    if (selectedDomains.length === 0) return
    
    // 关闭对话框
    setBulkDeleteDialogOpen(false)
    
    // 提取域名ID列表
    const domainIds = selectedDomains.map(domain => domain.id)
    
    // ✅ 一次 API 调用完成！
    try {
      await batchDeleteMutation.mutateAsync(domainIds)
      // mutation hook 内部已经处理了成功提示和刷新
      setSelectedDomains([])
    } catch (error: any) {
      // mutation hook 内部已经处理了错误提示
      // 失败时不清空选中状态，让用户可以重试
    }
  }

  // 加载状态
  if (isLoading) {
    return <LoadingState message="加载域名数据中..." />
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">加载域名列表失败</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  // 提取数据
  const domains = data?.domains || []
  const paginationInfo = data?.pagination

  return (
    <div className="space-y-4">
      {/* 域名数据表格 */}
      <DomainDataTable
        data={domains}
        columns={columns}
        onAddNew={() => setAddDialogOpen(true)}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={setSelectedDomains}
        searchPlaceholder="搜索域名..."
        searchColumn="name"
        pagination={pagination}
        onPaginationChange={setPagination}
        paginationInfo={paginationInfo}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除域名 "{domainToDelete?.name}" 及其所有关联数据（包括子域名、端点等）。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑域名对话框 */}
      {domainToEdit && (
        <EditDomainDialog
          domain={domainToEdit}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onEdit={handleDomainEdited}
        />
      )}

      {/* 批量删除确认对话框 */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除以下 {selectedDomains.length} 个域名及其所有关联数据（包括子域名、端点等）。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* 域名列表容器 - 固定最大高度并支持滚动 */}
          <div className="mt-2 p-2 bg-muted rounded-md max-h-96 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedDomains.map((domain) => (
                <li key={domain.id} className="flex items-center font-mono">
                  <span className="font-medium">{domain.name}</span>
                  {domain.description && (
                    <span className="ml-2 text-muted-foreground">- {domain.description}</span>
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
            >
              删除 {selectedDomains.length} 个域名
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 添加域名对话框 */}
      <AddDomainDialog 
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
