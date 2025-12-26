"use client"

import React, { useState, useMemo } from "react"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
  useEholeFingerprints,
  useBulkDeleteEholeFingerprints,
  useDeleteAllEholeFingerprints,
} from "@/hooks/use-fingerprints"
import { FingerprintService } from "@/services/fingerprint.service"
import { EholeFingerprintDataTable } from "./ehole-fingerprint-data-table"
import { createEholeFingerprintColumns } from "./ehole-fingerprint-columns"
import { EholeFingerprintDialog } from "./ehole-fingerprint-dialog"
import { ImportFingerprintDialog } from "./import-fingerprint-dialog"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import type { EholeFingerprint } from "@/types/fingerprint.types"

export function EholeFingerprintView() {
  const [selectedFingerprints, setSelectedFingerprints] = useState<EholeFingerprint[]>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [filterQuery, setFilterQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // 查询数据
  const { data, isLoading, isFetching, error, refetch } = useEholeFingerprints({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    filter: filterQuery || undefined,
  })

  // Mutations
  const bulkDeleteMutation = useBulkDeleteEholeFingerprints()
  const deleteAllMutation = useDeleteAllEholeFingerprints()

  // 搜索状态
  React.useEffect(() => {
    if (!isFetching && isSearching) {
      setIsSearching(false)
    }
  }, [isFetching, isSearching])

  const handleFilterChange = (value: string) => {
    setIsSearching(true)
    setFilterQuery(value)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  // 格式化日期
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  // 导出
  const handleExport = async () => {
    try {
      const blob = await FingerprintService.exportEholeFingerprints()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ehole-fingerprints-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("导出成功")
    } catch (error: any) {
      toast.error(error.message || "导出失败")
    }
  }

  // 批量删除
  const handleBulkDelete = async () => {
    if (selectedFingerprints.length === 0) return

    try {
      const ids = selectedFingerprints.map((f) => f.id)
      const result = await bulkDeleteMutation.mutateAsync(ids)
      toast.success(`删除成功：${result.deleted} 条`)
      setSelectedFingerprints([])
    } catch (error: any) {
      toast.error(error.message || "删除失败")
    }
  }

  // 删除所有
  const handleDeleteAll = async () => {
    try {
      const result = await deleteAllMutation.mutateAsync()
      toast.success(`删除成功：${result.deleted} 条`)
    } catch (error: any) {
      toast.error(error.message || "删除失败")
    }
  }

  // 列定义
  const columns = useMemo(
    () => createEholeFingerprintColumns({ formatDate }),
    []
  )

  // 转换数据
  const fingerprints: EholeFingerprint[] = useMemo(() => {
    if (!data?.results) return []
    return data.results
  }, [data])

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">加载失败</h3>
        <p className="text-muted-foreground text-center mb-4">
          {error.message || "加载指纹数据时出现错误"}
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
  if (isLoading && !data) {
    return <DataTableSkeleton toolbarButtonCount={3} rows={6} columns={7} />
  }

  return (
    <>
      <EholeFingerprintDataTable
        data={fingerprints}
        columns={columns}
        onSelectionChange={setSelectedFingerprints}
        filterValue={filterQuery}
        onFilterChange={handleFilterChange}
        isSearching={isSearching}
        onAddSingle={() => setAddDialogOpen(true)}
        onAddImport={() => setImportDialogOpen(true)}
        onExport={handleExport}
        onBulkDelete={handleBulkDelete}
        onDeleteAll={handleDeleteAll}
        totalCount={data?.total || 0}
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={{
          total: data?.total || 0,
          page: data?.page || 1,
          pageSize: data?.pageSize || 10,
          totalPages: data?.totalPages || 1,
        }}
        onPaginationChange={setPagination}
      />

      {/* 添加指纹对话框 */}
      <EholeFingerprintDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => refetch()}
      />

      {/* 导入指纹对话框 */}
      <ImportFingerprintDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => refetch()}
      />
    </>
  )
}
