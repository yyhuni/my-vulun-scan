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
  useDeleteDomainFromOrganization,
  useBatchDeleteDomainsFromOrganization 
} from "@/hooks/use-domains"

/**
 * 域名列表组件
 * 
 * 功能特性：
 * 1. 显示所有域名列表
 * 2. 支持搜索、排序、分页
 * 3. 支持编辑和移除操作（从关联组织移除）
 * 4. 使用真实后端 API
 */
export function DomainList() {
  // 状态管理
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [domainToRemove, setDomainToRemove] = useState<Domain | null>(null)
  const [domainToEdit, setDomainToEdit] = useState<Domain | null>(null)
  const [selectedDomains, setSelectedDomains] = useState<Domain[]>([])
  const [bulkRemoveDialogOpen, setBulkRemoveDialogOpen] = useState(false)
  
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

  // 移除 hooks
  const deleteDomainMutation = useDeleteDomainFromOrganization()
  const batchDeleteMutation = useBatchDeleteDomainsFromOrganization()

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

  // 处理移除操作（使用 useCallback 优化）
  const handleDelete = useCallback((domain: Domain) => {
    setDomainToRemove(domain)
    setRemoveDialogOpen(true)
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

  // 确认移除域名
  const confirmRemove = async () => {
    if (!domainToRemove) return
    
    const organizations = domainToRemove.organizations || []
    
    // 检查域名是否关联任何组织
    if (organizations.length === 0) {
      toast.error('该域名未关联任何组织，无法移除')
      setRemoveDialogOpen(false)
      setDomainToRemove(null)
      return
    }

    // 关闭对话框
    setRemoveDialogOpen(false)
    setDomainToRemove(null)
    
    // 从所有关联组织中移除该域名
    // 最后一次移除会导致域名成为孤儿并被自动删除
    toast.loading(`正在从 ${organizations.length} 个组织中移除域名...`, { 
      id: `remove-domain-${domainToRemove.id}` 
    })
    
    try {
      // 顺序执行移除操作
      for (const org of organizations) {
        await deleteDomainMutation.mutateAsync({
          organizationId: org.id,
          domainId: domainToRemove.id,
        })
      }
      
      toast.dismiss(`remove-domain-${domainToRemove.id}`)
      toast.success(`成功从 ${organizations.length} 个组织中移除域名`)
    } catch (error: any) {
      toast.dismiss(`remove-domain-${domainToRemove.id}`)
      // mutation 内部已经处理了错误提示，这里只需要捕获
    }
  }

  // 编辑域名成功回调
  const handleDomainEdited = (updatedDomain: Domain) => {
    setEditDialogOpen(false)
    setDomainToEdit(null)
  }

  // 批量移除处理函数
  const handleBulkRemove = () => {
    if (selectedDomains.length === 0) {
      return
    }
    setBulkRemoveDialogOpen(true)
  }

  // 确认批量移除
  const confirmBulkRemove = async () => {
    if (selectedDomains.length === 0) return
    
    // 关闭对话框
    setBulkRemoveDialogOpen(false)
    setSelectedDomains([])
    
    // 按组织分组：收集每个组织需要移除的域名ID
    const orgDomainMap = new Map<number, number[]>()
    
    selectedDomains.forEach(domain => {
      const organizations = domain.organizations || []
      if (organizations.length === 0) {
        toast.warning(`域名 ${domain.name} 未关联任何组织，跳过`)
        return
      }
      
      organizations.forEach(org => {
        if (!orgDomainMap.has(org.id)) {
          orgDomainMap.set(org.id, [])
        }
        orgDomainMap.get(org.id)!.push(domain.id)
      })
    })
    
    if (orgDomainMap.size === 0) {
      toast.error('所选域名未关联任何组织，无法移除')
      return
    }
    
    // 显示进度提示
    toast.loading(`正在从 ${orgDomainMap.size} 个组织中批量移除域名...`, { 
      id: 'bulk-remove-domains' 
    })
    
    try {
      // 对每个组织调用批量删除 API
      for (const [orgId, domainIds] of orgDomainMap.entries()) {
        await batchDeleteMutation.mutateAsync({
          organizationId: orgId,
          domainIds: domainIds,
        })
      }
      
      toast.dismiss('bulk-remove-domains')
      toast.success(`成功批量移除 ${selectedDomains.length} 个域名`)
    } catch (error: any) {
      toast.dismiss('bulk-remove-domains')
      // mutation 内部已经处理了错误提示
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
        onBulkDelete={handleBulkRemove}
        onSelectionChange={setSelectedDomains}
        searchPlaceholder="搜索域名..."
        searchColumn="name"
        pagination={pagination}
        onPaginationChange={setPagination}
        paginationInfo={paginationInfo}
      />

      {/* 移除确认对话框 */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将从关联组织中移除域名 "{domainToRemove?.name}"。如果该域名不再关联任何组织，将被自动删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemove} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              移除
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

      {/* 批量移除确认对话框 */}
      <AlertDialog open={bulkRemoveDialogOpen} onOpenChange={setBulkRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量移除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将从关联组织中移除以下 {selectedDomains.length} 个域名。如果这些域名不再关联任何组织，将被自动删除。
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
              onClick={confirmBulkRemove} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              移除 {selectedDomains.length} 个域名
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
