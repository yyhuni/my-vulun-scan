"use client"

import React, { useState, useMemo } from "react"
import { TargetVulnerabilitiesDataTable } from "@/components/assets/target/vulnerabilities/target-vulnerabilities-data-table"
import { createTargetVulnerabilityColumns } from "@/components/assets/target/vulnerabilities/target-vulnerabilities-columns"
import { VulnerabilityDetailDialog } from "@/components/assets/target/vulnerabilities/vulnerability-detail-dialog"
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
import type { Vulnerability } from "@/types/vulnerability.types"
import { mockVulnerabilities } from "@/mock/fixtures/vulnerabilities"

/**
 * 目标漏洞详情视图组件
 * 用于显示和管理目标下的漏洞列表
 */
export function TargetVulnerabilitiesDetailView({
  targetId
}: {
  targetId: number
}) {
  const [selectedVulnerabilities, setSelectedVulnerabilities] = useState<Vulnerability[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [vulnerabilityToDelete, setVulnerabilityToDelete] = useState<Vulnerability | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null)

  // 分页状态
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // 模拟数据 - 过滤出属于当前目标的漏洞
  const data = useMemo(() => {
    return mockVulnerabilities.filter(v => v.targetId === targetId)
  }, [targetId])

  // 计算分页信息
  const paginationInfo = useMemo(() => {
    const total = data.length
    const totalPages = Math.ceil(total / pagination.pageSize)
    const start = pagination.pageIndex * pagination.pageSize
    const end = start + pagination.pageSize
    const paginatedData = data.slice(start, end)

    return {
      data: paginatedData,
      total,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      totalPages,
    }
  }, [data, pagination])

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
  const navigate = (path: string) => {
    console.log("导航到:", path)
  }

  // 处理查看详情
  const handleViewDetail = (vulnerability: Vulnerability) => {
    setSelectedVulnerability(vulnerability)
    setDetailDialogOpen(true)
  }

  // 处理删除漏洞
  const handleDeleteVulnerability = (vulnerability: Vulnerability) => {
    setVulnerabilityToDelete(vulnerability)
    setDeleteDialogOpen(true)
  }

  // 确认删除漏洞
  const confirmDelete = async () => {
    if (!vulnerabilityToDelete) return

    setDeleteDialogOpen(false)
    setIsLoading(true)

    // 模拟API调用
    setTimeout(() => {
      console.log("删除漏洞:", vulnerabilityToDelete.id)
      setVulnerabilityToDelete(null)
      setIsLoading(false)
    }, 1000)
  }

  // 处理批量删除
  const handleBulkDelete = () => {
    if (selectedVulnerabilities.length === 0) {
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  // 确认批量删除
  const confirmBulkDelete = async () => {
    if (selectedVulnerabilities.length === 0) return

    const deletedIds = selectedVulnerabilities.map(vulnerability => vulnerability.id)

    setBulkDeleteDialogOpen(false)
    setIsLoading(true)

    // 模拟API调用
    setTimeout(() => {
      console.log("批量删除漏洞:", deletedIds)
      setSelectedVulnerabilities([])
      setIsLoading(false)
    }, 1000)
  }

  // 处理分页变化
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }

  // 创建列定义
  const vulnerabilityColumns = useMemo(
    () =>
      createTargetVulnerabilityColumns({
        formatDate,
        navigate,
        handleDelete: handleDeleteVulnerability,
        handleViewDetail,
      }),
    []
  )

  // 加载状态
  if (isLoading) {
    return <LoadingState message="加载漏洞数据中..." />
  }

  return (
    <>
      {/* 漏洞详情对话框 */}
      <VulnerabilityDetailDialog
        vulnerability={selectedVulnerability}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />

      <TargetVulnerabilitiesDataTable
        data={paginationInfo.data}
        columns={vulnerabilityColumns}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={setSelectedVulnerabilities}
        searchPlaceholder="搜索漏洞..."
        searchColumn="title"
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={{
          total: paginationInfo.total,
          page: paginationInfo.page,
          pageSize: paginationInfo.pageSize,
          totalPages: paginationInfo.totalPages,
        }}
        onPaginationChange={handlePaginationChange}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除漏洞 &quot;{vulnerabilityToDelete?.title}&quot; 及其相关数据。
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

      {/* 批量删除确认对话框 */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除以下 {selectedVulnerabilities.length} 个漏洞及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2 p-2 bg-muted rounded-md max-h-96 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedVulnerabilities.map((vulnerability) => (
                <li key={vulnerability.id} className="flex items-center">
                  <span className="font-medium">{vulnerability.title}</span>
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
              删除 {selectedVulnerabilities.length} 个漏洞
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

