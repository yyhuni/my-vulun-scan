"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ScheduledScanDataTable } from "@/components/scan/scheduled/scheduled-scan-data-table"
import { createScheduledScanColumns } from "@/components/scan/scheduled/scheduled-scan-columns"
import type { ScheduledScan } from "@/types/scheduled-scan.types"

/**
 * 定时扫描页面
 * 管理定时扫描任务配置
 */
export default function ScheduledScanPage() {
  const router = useRouter()
  const [scheduledScans, setScheduledScans] = React.useState<ScheduledScan[]>([])
  const [selectedScans, setSelectedScans] = React.useState<ScheduledScan[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // 模拟数据加载
  React.useEffect(() => {
    // TODO: 替换为实际的 API 调用
    const mockData: ScheduledScan[] = [
      {
        id: 1,
        name: "每日安全巡检",
        description: "每天凌晨对所有主域名进行全面安全扫描",
        strategy_id: 1,
        strategy_name: "全面安全扫描",
        frequency: "daily",
        target_domains: ["example.com", "test.com", "demo.com"],
        is_enabled: true,
        next_run_time: "2024-01-20T00:00:00Z",
        last_run_time: "2024-01-19T00:00:00Z",
        run_count: 45,
        created_at: "2024-01-01T10:00:00Z",
        updated_at: "2024-01-19T00:05:00Z",
        created_by: "admin",
      },
      {
        id: 2,
        name: "周末漏洞检测",
        description: "每周末对重要业务域名进行漏洞检测",
        strategy_id: 2,
        strategy_name: "快速漏洞检测",
        frequency: "weekly",
        target_domains: ["important.com", "business.com"],
        is_enabled: true,
        next_run_time: "2024-01-21T10:00:00Z",
        last_run_time: "2024-01-14T10:00:00Z",
        run_count: 12,
        created_at: "2024-01-05T14:30:00Z",
        updated_at: "2024-01-14T10:15:00Z",
        created_by: "admin",
      },
      {
        id: 3,
        name: "月度全面扫描",
        description: "每月1号对所有资产进行全面扫描和漏洞评估",
        strategy_id: 1,
        strategy_name: "全面安全扫描",
        frequency: "monthly",
        target_domains: ["example.com", "test.com", "demo.com", "app.com"],
        is_enabled: true,
        next_run_time: "2024-02-01T00:00:00Z",
        last_run_time: "2024-01-01T00:00:00Z",
        run_count: 3,
        created_at: "2023-11-01T09:00:00Z",
        updated_at: "2024-01-01T00:30:00Z",
        created_by: "admin",
      },
      {
        id: 4,
        name: "临时漏洞复测",
        description: "针对特定漏洞的一次性复测任务",
        strategy_id: 2,
        strategy_name: "快速漏洞检测",
        frequency: "once",
        target_domains: ["vulnerable.com"],
        is_enabled: false,
        next_run_time: "2024-01-25T15:00:00Z",
        run_count: 0,
        created_at: "2024-01-18T16:20:00Z",
        updated_at: "2024-01-18T16:20:00Z",
        created_by: "security_team",
      },
      {
        id: 5,
        name: "自定义深夜扫描",
        description: "使用 Cron 表达式配置的深夜扫描任务",
        strategy_id: 3,
        strategy_name: "子域名发现专项",
        frequency: "custom",
        cron_expression: "0 2 * * *",
        target_domains: ["target1.com", "target2.com", "target3.com"],
        is_enabled: true,
        next_run_time: "2024-01-20T02:00:00Z",
        last_run_time: "2024-01-19T02:00:00Z",
        run_count: 89,
        created_at: "2023-10-15T11:00:00Z",
        updated_at: "2024-01-19T02:30:00Z",
        created_by: "admin",
      },
    ]

    setTimeout(() => {
      setScheduledScans(mockData)
      setIsLoading(false)
    }, 500)
  }, [])

  // 格式化日期
  const formatDate = React.useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [])

  // 查看任务详情
  const handleView = React.useCallback((scan: ScheduledScan) => {
    toast.info(`查看定时任务: ${scan.name}`)
    // TODO: 导航到详情页
    // router.push(`/scan/scheduled/${scan.id}`)
  }, [])

  // 编辑任务
  const handleEdit = React.useCallback((scan: ScheduledScan) => {
    toast.info(`编辑定时任务: ${scan.name}`)
    // TODO: 打开编辑对话框或导航到编辑页面
  }, [])

  // 删除任务
  const handleDelete = React.useCallback((scan: ScheduledScan) => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          setScheduledScans((prev) => prev.filter((s) => s.id !== scan.id))
          resolve(true)
        }, 1000)
      }),
      {
        loading: `正在删除任务: ${scan.name}...`,
        success: "定时任务删除成功",
        error: "定时任务删除失败",
      }
    )
  }, [])

  // 切换任务启用状态
  const handleToggleStatus = React.useCallback((scan: ScheduledScan, enabled: boolean) => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          setScheduledScans((prev) =>
            prev.map((s) =>
              s.id === scan.id ? { ...s, is_enabled: enabled } : s
            )
          )
          resolve(true)
        }, 500)
      }),
      {
        loading: `正在${enabled ? "启用" : "禁用"}任务...`,
        success: `定时任务已${enabled ? "启用" : "禁用"}`,
        error: "操作失败",
      }
    )
  }, [])

  // 批量删除
  const handleBulkDelete = React.useCallback((selectedIds: number[]) => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          setScheduledScans((prev) => prev.filter((s) => !selectedIds.includes(s.id)))
          resolve(true)
        }, 1000)
      }),
      {
        loading: `正在删除 ${selectedIds.length} 个任务...`,
        success: `成功删除 ${selectedIds.length} 个定时任务`,
        error: "批量删除失败",
      }
    )
  }, [])

  // 添加新任务
  const handleAddNew = React.useCallback(() => {
    toast.info("打开新建定时任务对话框")
    // TODO: 打开新建对话框
  }, [])

  // 创建列定义
  const columns = React.useMemo(
    () =>
      createScheduledScanColumns({
        formatDate,
        handleView,
        handleEdit,
        handleDelete,
        handleToggleStatus,
      }),
    [formatDate, handleView, handleEdit, handleDelete, handleToggleStatus]
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-3xl font-bold">定时扫描</h1>
            <p className="text-muted-foreground mt-1">配置和管理定时扫描任务</p>
          </div>
        </div>
        <div className="px-4 lg:px-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* 页面标题 */}
      <div className="px-4 lg:px-6">
        <div>
          <h1 className="text-3xl font-bold">定时扫描</h1>
          <p className="text-muted-foreground mt-1">配置和管理定时扫描任务</p>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="px-4 lg:px-6">
        <ScheduledScanDataTable
          data={scheduledScans}
          columns={columns}
          onAddNew={handleAddNew}
          onBulkDelete={handleBulkDelete}
          onSelectionChange={setSelectedScans}
          searchPlaceholder="搜索任务名称..."
          searchColumn="name"
          addButtonText="新建定时扫描"
        />
      </div>
    </div>
  )
}
