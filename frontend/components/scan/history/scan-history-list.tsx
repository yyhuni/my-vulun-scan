"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ScanHistoryDataTable } from "./scan-history-data-table"
import { createScanHistoryColumns, type ScanRecord } from "./scan-history-columns"
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
import { toast } from "sonner"

/**
 * 扫描历史列表组件
 * 用于显示和管理扫描历史记录
 */
export function ScanHistoryList() {
  const [selectedScans, setSelectedScans] = useState<ScanRecord[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [scanToDelete, setScanToDelete] = useState<ScanRecord | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // 分页状态
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // 模拟数据 - TODO: 替换为实际的 API 调用
  const [scans, setScans] = useState<ScanRecord[]>([
    {
      id: 1,
      name: "生产环境安全扫描",
      type: "全面扫描",
      targets: ["example.com", "api.example.com"],
      status: "completed",
      startTime: "2025-01-10 14:30:00",
      endTime: "2025-01-10 15:45:00",
      duration: "1小时15分",
      findings: 23,
    },
    {
      id: 2,
      name: "开发环境快速检测",
      type: "快速扫描",
      targets: ["dev.example.com"],
      status: "running",
      startTime: "2025-01-13 10:20:00",
      findings: 12,
    },
    {
      id: 3,
      name: "API接口漏洞扫描",
      type: "漏洞扫描",
      targets: ["192.168.1.100"],
      status: "failed",
      startTime: "2025-01-12 08:15:00",
      endTime: "2025-01-12 08:20:00",
      duration: "5分钟",
      findings: 0,
    },
    {
      id: 4,
      name: "测试环境端口扫描",
      type: "端口扫描",
      targets: ["192.168.1.0/24"],
      status: "pending",
      startTime: "2025-01-13 16:00:00",
      findings: 0,
    },
    {
      id: 5,
      name: "Web应用漏洞检测",
      type: "漏洞扫描",
      targets: ["webapp.example.com"],
      status: "completed",
      startTime: "2025-01-11 09:00:00",
      endTime: "2025-01-11 10:30:00",
      duration: "1小时30分",
      findings: 15,
    },
  ])

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

  // 处理删除扫描记录
  const handleDeleteScan = (scan: ScanRecord) => {
    setScanToDelete(scan)
    setDeleteDialogOpen(true)
  }

  // 确认删除扫描记录
  const confirmDelete = async () => {
    if (!scanToDelete) return

    setDeleteDialogOpen(false)
    
    try {
      // TODO: 调用实际的删除 API
      setScans(prev => prev.filter(s => s.id !== scanToDelete.id))
      toast.success(`已删除扫描记录: ${scanToDelete.name}`)
    } catch (error) {
      toast.error("删除失败，请重试")
    } finally {
      setScanToDelete(null)
    }
  }

  // 处理批量删除
  const handleBulkDelete = () => {
    if (selectedScans.length === 0) {
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  // 确认批量删除
  const confirmBulkDelete = async () => {
    if (selectedScans.length === 0) return

    const deletedIds = selectedScans.map(scan => scan.id)
    
    setBulkDeleteDialogOpen(false)
    
    try {
      // TODO: 调用实际的批量删除 API
      setScans(prev => prev.filter(s => !deletedIds.includes(s.id)))
      toast.success(`已删除 ${selectedScans.length} 个扫描记录`)
      setSelectedScans([])
    } catch (error) {
      toast.error("批量删除失败，请重试")
    }
  }

  // 处理新建扫描
  const handleAddNew = () => {
    router.push("/scan/new")
  }

  // 处理分页变化
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }

  // 创建列定义
  const scanColumns = useMemo(
    () =>
      createScanHistoryColumns({
        formatDate,
        navigate,
        handleDelete: handleDeleteScan,
      }),
    []
  )

  // 加载状态
  if (isLoading) {
    return <LoadingState message="加载扫描历史数据中..." />
  }

  return (
    <>
      <ScanHistoryDataTable
        data={scans}
        columns={scanColumns}
        onAddNew={handleAddNew}
        onBulkDelete={handleBulkDelete}
        onSelectionChange={setSelectedScans}
        searchPlaceholder="搜索扫描记录..."
        searchColumn="name"
        addButtonText="新建扫描"
        pagination={pagination}
        setPagination={setPagination}
        onPaginationChange={handlePaginationChange}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除扫描记录 &quot;{scanToDelete?.name}&quot; 及其相关数据。
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
              此操作无法撤销。这将永久删除以下 {selectedScans.length} 个扫描记录及其相关数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* 扫描记录列表容器 */}
          <div className="mt-2 p-2 bg-muted rounded-md max-h-96 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedScans.map((scan) => (
                <li key={scan.id} className="flex items-center justify-between">
                  <span className="font-medium">{scan.name}</span>
                  <span className="text-muted-foreground text-xs">{scan.type}</span>
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
              删除 {selectedScans.length} 个记录
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
