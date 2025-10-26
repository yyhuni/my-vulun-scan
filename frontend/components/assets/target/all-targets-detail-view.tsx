"use client"

import React, { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createAllTargetsColumns, type Target } from "@/components/assets/target/all-targets-columns"
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
import { toast } from "sonner"
import { LoadingSpinner } from "@/components/loading-spinner"

// Mock 数据
const mockTargets: Target[] = [
  {
    id: 1,
    name: "example.com",
    type: "domain",
    organizations: [
      { id: 1, name: "组织 A" },
      { id: 2, name: "组织 B" },
    ],
    domainCount: 15,
    endpointCount: 120,
    description: "主要业务域名",
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "192.168.1.0/24",
    type: "cidr",
    organizations: [
      { id: 1, name: "组织 A" },
    ],
    domainCount: 0,
    endpointCount: 50,
    description: "内网 IP 段",
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: "10.0.0.1",
    type: "ip",
    organizations: [
      { id: 3, name: "组织 C" },
    ],
    domainCount: 0,
    endpointCount: 8,
    description: "服务器 IP",
    updatedAt: new Date().toISOString(),
  },
]

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
  const [isDeleting, setIsDeleting] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  
  // 模拟加载状态
  const [isLoading] = useState(false)
  const [targets] = useState(mockTargets)

  // 处理添加目标
  const handleAddTarget = useCallback(() => {
    setIsAddDialogOpen(true)
  }, [])

  // 处理删除单个目标
  const handleDeleteTarget = useCallback((target: Target) => {
    setTargetToDelete(target)
    setDeleteDialogOpen(true)
  }, [])

  // 确认删除目标（mock 实现）
  const confirmDelete = async () => {
    if (!targetToDelete) return

    setIsDeleting(true)
    
    // 模拟 API 调用
    setTimeout(() => {
      setDeleteDialogOpen(false)
      setTargetToDelete(null)
      setIsDeleting(false)
      toast.success(`已删除目标 "${targetToDelete.name}"`)
    }, 1000)
  }

  // 处理批量删除
  const handleBatchDelete = useCallback(() => {
    if (selectedTargets.length === 0) return
    setBulkDeleteDialogOpen(true)
  }, [selectedTargets])

  // 确认批量删除（mock 实现）
  const confirmBulkDelete = async () => {
    if (selectedTargets.length === 0) return

    setIsBulkDeleting(true)
    
    // 模拟 API 调用
    setTimeout(() => {
      setBulkDeleteDialogOpen(false)
      setSelectedTargets([])
      setIsBulkDeleting(false)
      toast.success(`已删除 ${selectedTargets.length} 个目标`)
    }, 1000)
  }

  // 创建表格列
  const columns = createAllTargetsColumns({
    formatDate,
    navigate: (path: string) => router.push(path),
    handleDelete: handleDeleteTarget,
  })

  // 加载中
  if (isLoading) {
    return <LoadingState message="加载目标数据中..." />
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
              disabled={isDeleting}
            >
              {isDeleting ? (
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
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? (
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
