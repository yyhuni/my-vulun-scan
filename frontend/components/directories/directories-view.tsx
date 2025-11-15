"use client"

import React, { useCallback, useMemo, useState } from "react"
import { DirectoriesDataTable } from "./directories-data-table"
import { createDirectoryColumns } from "./directories-columns"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import { Button } from "@/components/ui/button"
import { useTargetDirectories, useScanDirectories, useDeleteDirectory, useBulkDeleteDirectories } from "@/hooks/use-directories"
import type { Directory } from "@/types/directory.types"
import { toast } from "sonner"
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

export function DirectoriesView({
  targetId,
  scanId,
}: {
  targetId?: number
  scanId?: number
}) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [selectedDirectories, setSelectedDirectories] = useState<Directory[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [directoryToDelete, setDirectoryToDelete] = useState<Directory | null>(null)

  const deleteDirectoryMutation = useDeleteDirectory()
  const bulkDeleteMutation = useBulkDeleteDirectories()

  const targetQuery = useTargetDirectories(
    targetId || 0,
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    },
    { enabled: !!targetId }
  )

  const scanQuery = useScanDirectories(
    scanId || 0,
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    },
    { enabled: !!scanId }
  )

  const activeQuery = targetId ? targetQuery : scanQuery
  const { data, isLoading, error, refetch } = activeQuery

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }, [])

  const handleDeleteDirectory = (directory: Directory) => {
    setDirectoryToDelete(directory)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!directoryToDelete) return

    setDeleteDialogOpen(false)
    setDirectoryToDelete(null)

    deleteDirectoryMutation.mutate(directoryToDelete.id)
  }

  const columns = useMemo(
    () =>
      createDirectoryColumns({
        formatDate,
        onDelete: handleDeleteDirectory,
      }),
    [formatDate]
  )

  const directories: Directory[] = useMemo(() => {
    if (!data?.results) return []
    return data.results
  }, [data])

  const paginationInfo = data
    ? {
        total: data.total,
        page: data.page,
        pageSize: data.pageSize,
        totalPages: data.totalPages,
      }
    : undefined

  const handleBulkDelete = useCallback(async () => {
    if (selectedDirectories.length === 0) {
      toast.error("请选择要删除的目录")
      return
    }

    try {
      const directoryIds = selectedDirectories.map(directory => directory.id)
      await bulkDeleteMutation.mutateAsync(directoryIds)
      toast.success(`成功删除 ${selectedDirectories.length} 个目录`)
      setSelectedDirectories([])
    } catch (error) {
      console.error("批量删除失败:", error)
      toast.error("删除失败，请重试")
    }
  }, [selectedDirectories, bulkDeleteMutation])

  const handleSelectionChange = useCallback((selectedRows: Directory[]) => {
    setSelectedDirectories(selectedRows)
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <span className="text-destructive">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">加载失败</h3>
        <p className="text-muted-foreground text-center mb-4">
          加载目录数据时出现错误，请重试
        </p>
        <Button onClick={() => refetch()}>重新加载</Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <DataTableSkeleton
        toolbarButtonCount={2}
        rows={6}
        columns={9}
      />
    )
  }

  return (
    <>
      <DirectoriesDataTable
        data={directories}
        columns={columns}
        searchPlaceholder="搜索目录 URL..."
        searchColumn="url"
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={paginationInfo}
        onPaginationChange={setPagination}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={handleSelectionChange}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除目录 &quot;{directoryToDelete?.url}&quot; 及其相关数据。
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
    </>
  )
}
