"use client"

import React, { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createAllTargetsColumns } from "@/components/assets/target/all-targets-columns"
import { TargetsDataTable } from "@/components/assets/target/targets-data-table"
import { AddTargetDialog } from "@/components/assets/target/add-target-dialog"
import { LoadingState } from "@/components/loading-spinner"
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
import { formatDate } from "@/lib/utils"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useTargets, useDeleteTarget, useBatchDeleteTargets } from "@/hooks/use-targets"
import type { Target } from "@/types/target.types"

/**
 * 所有目标详情视图组件
 * 显示系统中所有目标的列表，支持搜索、分页、删除等操作
 */
export function AllTargetsDetailView() {
  const router = useRouter()
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [selectedTargets, setSelectedTargets] = useState<Target[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [targetToDelete, setTargetToDelete] = useState<Target | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [shouldPrefetchOrgs, setShouldPrefetchOrgs] = useState(false)

  // 使用 API hooks
  const { data, isLoading, error } = useTargets(pagination.pageIndex + 1, pagination.pageSize)
  const deleteTargetMutation = useDeleteTarget()
  const batchDeleteMutation = useBatchDeleteTargets()

  const targets = data?.results || []
  const totalCount = data?.count || 0

  // 处理添加目标
  const handleAddTarget = useCallback(() => {
    setIsAddDialogOpen(true)
  }, [])

  // 处理删除单个目标
  const handleDeleteTarget = useCallback((target: Target) => {
    setTargetToDelete(target)
    setDeleteDialogOpen(true)
  }, [])

  // 确认删除目标
  const confirmDelete = async () => {
    if (!targetToDelete) return

    try {
      await deleteTargetMutation.mutateAsync(targetToDelete.id)
      setDeleteDialogOpen(false)
      setTargetToDelete(null)
    } catch (error) {
      // 错误已在 hook 中处理
      console.error('删除失败:', error)
    }
  }

  // 处理批量删除
  const handleBatchDelete = useCallback(() => {
    if (selectedTargets.length === 0) return
    setBulkDeleteDialogOpen(true)
  }, [selectedTargets])

  // 确认批量删除
  const confirmBulkDelete = async () => {
    if (selectedTargets.length === 0) return

    try {
      await batchDeleteMutation.mutateAsync({
        targetIds: selectedTargets.map((t) => t.id),
      })
      setBulkDeleteDialogOpen(false)
      setSelectedTargets([])
    } catch (error) {
      // 错误已在 hook 中处理
      console.error('批量删除失败:', error)
    }
  }

  // 处理发起扫描
  const handleInitiateScan = useCallback((target: Target) => {
    // TODO: 实现发起扫描功能
    console.log('发起扫描:', target)
    router.push(`/scan/new?targetId=${target.id}`)
  }, [router])

  // 处理定时扫描
  const handleScheduleScan = useCallback((target: Target) => {
    // TODO: 实现定时扫描功能
    console.log('定时扫描:', target)
    router.push(`/scan/scheduled?targetId=${target.id}`)
  }, [router])

  // 处理编辑目标
  const handleEdit = useCallback((target: Target) => {
    // TODO: 实现编辑功能
    console.log('编辑目标:', target)
    // 可以在这里打开编辑对话框或跳转到编辑页面
  }, [])

  // 创建表格列
  const columns = createAllTargetsColumns({
    formatDate,
    navigate: (path: string) => router.push(path),
    handleDelete: handleDeleteTarget,
    handleInitiateScan,
    handleScheduleScan,
    handleEdit,
  })

  // 加载中
  if (isLoading) {
    return <LoadingState message="加载目标数据中..." />
  }

  // 错误处理
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-2">加载失败</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <TargetsDataTable
        data={targets}
        columns={columns}
        onAddNew={handleAddTarget}
        onAddHover={() => setShouldPrefetchOrgs(true)}
        onBulkDelete={handleBatchDelete}
        onSelectionChange={setSelectedTargets}
        searchPlaceholder="搜索目标名称..."
        searchColumn="name"
        addButtonText="添加目标"
      />

      {/* 添加目标对话框 */}
      <AddTargetDialog
        onAdd={() => {
          setIsAddDialogOpen(false)
        }}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        prefetchEnabled={shouldPrefetchOrgs}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除目标</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除目标 &quot;{targetToDelete?.name}&quot; 及其所有关联数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteTargetMutation.isPending}
            >
              {deleteTargetMutation.isPending ? (
                <>
                  <LoadingSpinner/>
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认对话框 */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除目标</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除以下 {selectedTargets.length} 个目标及其所有关联数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* 目标列表容器 - 固定最大高度并支持滚动 */}
          <div className="mt-2 p-2 bg-muted rounded-md max-h-96 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedTargets.map((target) => (
                <li key={target.id} className="flex items-center">
                  <span className="font-medium">{target.name}</span>
                  {target.description && (
                    <span className="text-muted-foreground ml-2">- {target.description}</span>
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
              disabled={batchDeleteMutation.isPending}
            >
              {batchDeleteMutation.isPending ? (
                <>
                  <LoadingSpinner/>
                  删除中...
                </>
              ) : (
                `确认删除 ${selectedTargets.length} 个目标`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
