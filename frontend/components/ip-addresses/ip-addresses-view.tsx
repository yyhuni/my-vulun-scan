"use client"

import React, { useCallback, useMemo, useState, useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { IPAddressesDataTable } from "./ip-addresses-data-table"
import { createIPAddressColumns } from "./ip-addresses-columns"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import { Button } from "@/components/ui/button"
import { useTargetIPAddresses, useScanIPAddresses } from "@/hooks/use-ip-addresses"
import type { IPAddress } from "@/types/ip-address.types"
import { IPAddressService } from "@/services/ip-address.service"
import { toast } from "sonner"

export function IPAddressesView({
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
  const [selectedIPAddresses, setSelectedIPAddresses] = useState<IPAddress[]>([])

  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const handleSearchChange = (value: string) => {
    setIsSearching(true)
    setSearchQuery(value)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  const targetQuery = useTargetIPAddresses(
    targetId || 0,
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: searchQuery || undefined,
    },
    { enabled: !!targetId }
  )

  const scanQuery = useScanIPAddresses(
    scanId || 0,
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: searchQuery || undefined,
    },
    { enabled: !!scanId }
  )

  const activeQuery = targetId ? targetQuery : scanQuery
  const { data, isLoading, isFetching, error, refetch } = activeQuery

  useEffect(() => {
    if (!isFetching && isSearching) {
      setIsSearching(false)
    }
  }, [isFetching, isSearching])

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

  const columns = useMemo(
    () =>
      createIPAddressColumns({
        formatDate,
      }),
    [formatDate]
  )

  const ipAddresses: IPAddress[] = useMemo(() => {
    return data?.results ?? []
  }, [data])

  const paginationInfo = data
    ? {
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: data.totalPages,
    }
    : undefined
  const handleSelectionChange = useCallback((selectedRows: IPAddress[]) => {
    setSelectedIPAddresses(selectedRows)
  }, [])

  // 处理下载所有 IP 地址
  const handleDownloadAll = async () => {
    try {
      let blob: Blob | null = null

      if (scanId) {
        blob = await IPAddressService.exportIPAddressesByScanId(scanId)
      } else if (targetId) {
        blob = await IPAddressService.exportIPAddressesByTargetId(targetId)
      } else {
        if (!ipAddresses || ipAddresses.length === 0) {
          return
        }
        // 前端生成 CSV（无 scanId/targetId 时的 fallback）
        const csvContent = generateCSV(ipAddresses)
        blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
      }

      if (!blob) return

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const prefix = scanId ? `scan-${scanId}` : targetId ? `target-${targetId}` : "ip-addresses"
      a.href = url
      a.download = `${prefix}-ip-addresses-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("下载 IP 地址列表失败", error)
      toast.error("下载 IP 地址列表失败，请稍后重试")
    }
  }

  // 格式化日期为 YYYY-MM-DD HH:MM:SS（与后端一致）
  const formatDateForCSV = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  // 生成 CSV 内容（原始格式：每个 host+port 组合一行）
  const generateCSV = (items: IPAddress[]): string => {
    const BOM = '\ufeff'
    const headers = ['ip', 'host', 'port', 'discovered_at']
    
    const escapeCSV = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }
    
    // 展开聚合数据为原始格式：每个 (ip, host, port) 组合一行
    const rows: string[] = []
    for (const item of items) {
      for (const host of item.hosts) {
        for (const port of item.ports) {
          rows.push([
            escapeCSV(item.ip),
            escapeCSV(host),
            escapeCSV(String(port)),
            escapeCSV(formatDateForCSV(item.discoveredAt))
          ].join(','))
        }
      }
    }
    
    return BOM + [headers.join(','), ...rows].join('\n')
  }

  // 处理下载选中的 IP 地址
  const handleDownloadSelected = () => {
    if (selectedIPAddresses.length === 0) {
      return
    }
    
    const csvContent = generateCSV(selectedIPAddresses)
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const prefix = scanId ? `scan-${scanId}` : targetId ? `target-${targetId}` : "ip-addresses"
    a.href = url
    a.download = `${prefix}-ip-addresses-selected-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">加载失败</h3>
        <p className="text-muted-foreground text-center mb-4">
          {error.message || "加载 IP 地址数据时出现错误，请重试"}
        </p>
        <Button onClick={() => refetch()}>重新加载</Button>
      </div>
    )
  }

  if (isLoading && !data) {
    return (
      <DataTableSkeleton
        toolbarButtonCount={1}
        rows={6}
        columns={4}
      />
    )
  }

  return (
    <>
      <IPAddressesDataTable
        data={ipAddresses}
        columns={columns}
        searchPlaceholder="搜索IP地址..."
        searchColumn="ip"
        searchValue={searchQuery}
        onSearch={handleSearchChange}
        isSearching={isSearching}
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={paginationInfo}
        onSelectionChange={handleSelectionChange}
        onDownloadAll={handleDownloadAll}
        onDownloadSelected={handleDownloadSelected}
      />
    </>
  )
}
