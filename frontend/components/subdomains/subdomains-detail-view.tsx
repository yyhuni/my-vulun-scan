"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useTarget } from "@/hooks/use-targets"
import { 
  useDeleteSubdomain, 
  useBatchDeleteSubdomains,
  useTargetSubdomains,
  useScanSubdomains 
} from "@/hooks/use-subdomains"
import { SubdomainsDataTable } from "./subdomains-data-table"
import { createSubdomainColumns } from "./subdomains-columns"
import { LoadingSpinner } from "@/components/loading-spinner"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
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
import type { Subdomain } from "@/types/subdomain.types"

/**
 * 子域名详情视图组件
 * 支持两种模式：
 * 1. targetId: 显示目标下的所有子域名
 * 2. scanId: 显示扫描历史中的子域名
 */
export function SubdomainsDetailView({
  targetId,
  scanId
}: {
  targetId?: number
  scanId?: number
}) {
  const [selectedSubdomains, setSelectedSubdomains] = useState<Subdomain[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [subdomainToDelete, setSubdomainToDelete] = useState<Subdomain | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  // 分页状态
  const [pagination, setPagination] = useState({
    pageIndex: 0,  // 0-based for react-table
    pageSize: 10,
  })

  // 根据 targetId 或 scanId 获取子域名数据（传入分页参数）
  const targetSubdomainsQuery = useTargetSubdomains(
    targetId || 0,
    {
      page: pagination.pageIndex + 1, // 转换为 1-based
      pageSize: pagination.pageSize,
    },
    { enabled: !!targetId }
  )
  const scanSubdomainsQuery = useScanSubdomains(
    scanId || 0,
    {
      page: pagination.pageIndex + 1, // 转换为 1-based
      pageSize: pagination.pageSize,
    },
    { enabled: !!scanId }
  )

  // 选择当前使用的查询结果
  const activeQuery = targetId ? targetSubdomainsQuery : scanSubdomainsQuery
  const { data: subdomainsData, isLoading, error, refetch } = activeQuery

  // 获取目标信息（仅在 targetId 模式下）
  const { data: targetData } = useTarget(targetId || 0)

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

  // 导航函数
  const router = useRouter()
  const navigate = (path: string) => {
    router.push(path)
  }

  // 处理删除域名
  const handleDeleteSubdomain = (subdomain: Subdomain) => {
    setSubdomainToDelete(subdomain)
    setDeleteDialogOpen(true)
  }

  // 确认删除域名
  const confirmDelete = async () => {
    if (!subdomainToDelete) return

    setDeleteDialogOpen(false)
    setSubdomainToDelete(null)

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

    batchDeleteSubdomains.mutate(deletedIds)
  }

  // 处理分页变化
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }

  // 处理标记重要子域名
  const handleMarkImportant = (domain: Subdomain) => {
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
    console.log('下载选中的子域名:', selectedSubdomains)
    // 可以将选中的子域名生成文件并下载
    if (selectedSubdomains.length === 0) {
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
  const subdomainColumns = useMemo(
    () =>
      createSubdomainColumns({
        formatDate,
        navigate,
        handleDelete: handleDeleteSubdomain,
        handleMarkImportant,
      }),
    [formatDate, navigate, handleDeleteSubdomain, handleMarkImportant]
  )

  // 转换后端数据格式为前端 Subdomain 类型（必须在条件渲染之前调用）
  // 注意：后端使用 djangorestframework-camel-case 自动转换字段名为 camelCase
  const subdomains: Subdomain[] = useMemo(() => {
    if (!subdomainsData?.results) return []
    return subdomainsData.results.map((item: any) => ({
      id: item.id,
      name: item.name,
      createdAt: item.createdAt,      // 后端已转换为 camelCase
      updatedAt: item.createdAt,      // 使用 createdAt 作为 updatedAt 的默认值
      cname: item.cname || [],
      isCdn: item.isCdn || false,     // 后端已转换为 camelCase
      cdnName: item.cdnName || '',    // 后端已转换为 camelCase
      ports: item.ports || [],        // 端口数据
      ipAddresses: item.ipAddresses || [],  // IP地址列表
    }))
  }, [subdomainsData])

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
    return (
      <DataTableSkeleton
        toolbarButtonCount={4}
        rows={6}
        columns={4}
      />
    )
  }

  return (
    <>
      <SubdomainsDataTable
        data={subdomains}
        columns={subdomainColumns}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={setSelectedSubdomains}
        searchPlaceholder="搜索子域名..."
        searchColumn="name"
        onDownloadAll={handleDownloadAll}
        onDownloadSelected={handleDownloadSelected}
        onDownloadInteresting={handleDownloadInteresting}
        onDownloadImportant={handleDownloadImportant}
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={{
          total: subdomainsData?.total || 0,
          page: subdomainsData?.page || 1,
          pageSize: subdomainsData?.pageSize || 10,
          totalPages: subdomainsData?.totalPages || 1,
        }}
        onPaginationChange={handlePaginationChange}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除子域名 &quot;{subdomainToDelete?.name}&quot; 及其相关数据。
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
              此操作无法撤销。这将永久删除以下 {selectedSubdomains.length} 个子域名及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 p-2 bg-muted rounded-md max-h-96 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedSubdomains.map((subdomain) => (
                <li key={subdomain.id} className="flex items-center">
                  <span className="font-medium font-mono">{subdomain.name}</span>
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
