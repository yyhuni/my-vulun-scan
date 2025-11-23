"use client"

import React, { useCallback, useMemo, useState } from "react"
import { WebSitesDataTable } from "./websites-data-table"
import { createWebSiteColumns } from "./websites-columns"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import { Button } from "@/components/ui/button"
import { useTargetWebSites, useScanWebSites } from "@/hooks/use-websites"
import type { WebSite } from "@/types/website.types"
import { toast } from "sonner"

export function WebSitesView({
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
  const [selectedWebSites, setSelectedWebSites] = useState<WebSite[]>([])

  const targetQuery = useTargetWebSites(
    targetId || 0,
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    },
    { enabled: !!targetId }
  )

  const scanQuery = useScanWebSites(
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

  const handleViewDetail = (website: WebSite) => {
    // TODO: 实现查看网站详细功能
    console.log('查看网站详细:', website)
  }

  const columns = useMemo(
    () =>
      createWebSiteColumns({
        formatDate,
        onViewDetail: handleViewDetail,
      }),
    [formatDate]
  )

  const websites: WebSite[] = useMemo(() => {
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

  const handleSelectionChange = useCallback((selectedRows: WebSite[]) => {
    setSelectedWebSites(selectedRows)
  }, [])

  // 处理下载所有网站
  const handleDownloadAll = () => {
    // TODO: 实现下载所有网站功能
    console.log('下载所有网站')
    toast.info("下载功能开发中...")
  }

  // 处理下载选中的网站
  const handleDownloadSelected = () => {
    if (selectedWebSites.length === 0) {
      return
    }
    console.log('下载选中的网站', selectedWebSites)
    // TODO: 实现下载选中网站功能
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <span className="text-destructive">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">加载失败</h3>
        <p className="text-muted-foreground text-center mb-4">
          加载网站数据时出现错误，请重试
        </p>
        <Button onClick={() => refetch()}>重新加载</Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <DataTableSkeleton
        toolbarButtonCount={3}
        rows={6}
        columns={6}
      />
    )
  }

  return (
    <>
      <WebSitesDataTable
        data={websites}
        columns={columns}
        searchPlaceholder="搜索网站 URL 或标题..."
        searchColumn="url"
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={paginationInfo}
        onPaginationChange={setPagination}
        onSelectionChange={handleSelectionChange}
        onDownloadAll={handleDownloadAll}
        onDownloadSelected={handleDownloadSelected}
      />
    </>
  )
}
