"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useTargetDomains, useTarget } from "@/hooks/use-targets"
import { useDeleteDomain, useBatchDeleteDomains } from "@/hooks/use-domains"
import { TargetDomainsDataTable } from "@/components/assets/target/domains/target-domains-data-table"
import { createTargetDomainColumns } from "@/components/assets/target/domains/target-domains-columns"
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
import type { Domain } from "@/types/domain.types"

/**
 * 目标域名详情视图组件
 * 用于显示和管理目标下的域名列表
 */
export function TargetDomainsDetailView({
  targetId
}: {
  targetId: number
}) {
  const [selectedDomains, setSelectedDomains] = useState<Domain[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [domainToDelete, setDomainToDelete] = useState<Domain | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  // 分页状态
  const [pagination, setPagination] = useState({
    pageIndex: 0,  // 0-based for react-table
    pageSize: 10,
  })

  // 使用 React Query 获取目标域名数据
  const {
    data,
    isLoading,
    error,
    refetch
  } = useTargetDomains(targetId, {
    page: pagination.pageIndex + 1, // 转换为 1-based
    pageSize: pagination.pageSize,
  })

  // 获取目标信息
  const { data: targetData } = useTarget(targetId)

  // Mutations
  const deleteDomain = useDeleteDomain()
  const batchDeleteDomains = useBatchDeleteDomains()

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
  const router = useRouter()
  const navigate = (path: string) => {
    router.push(path)
  }

  // 处理删除域名
  const handleDeleteDomain = (domain: Domain) => {
    setDomainToDelete(domain)
    setDeleteDialogOpen(true)
  }

  // 确认删除域名
  const confirmDelete = async () => {
    if (!domainToDelete) return

    setDeleteDialogOpen(false)
    setDomainToDelete(null)

    deleteDomain.mutate(domainToDelete.id)
  }

  // 处理批量删除
  const handleBulkDelete = () => {
    if (selectedDomains.length === 0) {
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  // 确认批量删除
  const confirmBulkDelete = async () => {
    if (selectedDomains.length === 0) return

    const deletedIds = selectedDomains.map(domain => domain.id)

    setBulkDeleteDialogOpen(false)
    setSelectedDomains([])

    batchDeleteDomains.mutate(deletedIds)
  }

  // 处理分页变化
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }

  // 处理标记重要子域名
  const handleMarkImportant = (domain: Domain) => {
    // TODO: 实现标记重要子域名功能
    console.log('标记重要子域名:', domain)
    // 可以在这里调用 API 更新域名的 isImportant 状态
  }

  // 处理下载所有子域名
  const handleDownloadAll = () => {
    // TODO: 实现下载所有子域名功能
    console.log('下载所有子域名')
    // 可以生成包含所有子域名的文件并下载
  }

  // 处理下载有趣的子域名
  const handleDownloadInteresting = () => {
    // TODO: 实现下载有趣的子域名功能
    console.log('下载有趣的子域名')
    // 可以根据某些规则筛选有趣的子域名并下载
  }

  // 处理下载重要的子域名
  const handleDownloadImportant = () => {
    // TODO: 实现下载重要的子域名功能
    console.log('下载重要的子域名')
    // 可以筛选标记为重要的子域名并下载
  }

  // 处理下载选中的子域名
  const handleDownloadSelected = () => {
    // TODO: 实现下载选中的子域名功能
    console.log('下载选中的子域名:', selectedDomains)
    // 可以将选中的子域名生成文件并下载
    if (selectedDomains.length === 0) {
      return
    }
    // 示例：生成文本文件
    // const content = selectedDomains.map(d => d.name).join('\n')
    // const blob = new Blob([content], { type: 'text/plain' })
    // const url = URL.createObjectURL(blob)
    // const a = document.createElement('a')
    // a.href = url
    // a.download = `selected-subdomains-${Date.now()}.txt`
    // a.click()
    // URL.revokeObjectURL(url)
  }

  // 创建列定义
  const domainColumns = useMemo(
    () =>
      createTargetDomainColumns({
        formatDate,
        navigate,
        handleDelete: handleDeleteDomain,
        handleMarkImportant,
      }),
    [formatDate, navigate, handleDeleteDomain, handleMarkImportant]
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
          {error.message || "加载域名数据时出现错误，请重试"}
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
    return <LoadingState message="加载域名数据中..." />
  }

  return (
    <>
      <TargetDomainsDataTable
        data={data?.domains || []}
        columns={domainColumns}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={setSelectedDomains}
        searchPlaceholder="搜索域名..."
        searchColumn="name"
        onDownloadAll={handleDownloadAll}
        onDownloadSelected={handleDownloadSelected}
        onDownloadInteresting={handleDownloadInteresting}
        onDownloadImportant={handleDownloadImportant}
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={{
          total: data?.pagination.total || 0,
          page: data?.pagination.page || 1,
          pageSize: data?.pagination.pageSize || 10,
          totalPages: data?.pagination.totalPages || 1,
        }}
        onPaginationChange={handlePaginationChange}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除域名 &quot;{domainToDelete?.name}&quot; 及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDomain.isPending}
            >
              {deleteDomain.isPending ? (
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
              此操作无法撤销。这将永久删除以下 {selectedDomains.length} 个域名及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 p-2 bg-muted rounded-md max-h-96 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedDomains.map((domain) => (
                <li key={domain.id} className="flex items-center">
                  <span className="font-medium font-mono">{domain.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={batchDeleteDomains.isPending}
            >
              {batchDeleteDomains.isPending ? (
                <>
                  <LoadingSpinner/>
                  删除中...
                </>
              ) : (
                `删除 ${selectedDomains.length} 个域名`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

