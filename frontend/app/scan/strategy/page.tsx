"use client"

import React from "react"
import { toast } from "sonner"
import { StrategyDataTable } from "@/components/scan/strategy/strategy-data-table"
import { createStrategyColumns } from "@/components/scan/strategy/strategy-columns"
import type { ScanStrategy } from "@/types/strategy.types"

/**
 * 扫描策略页面
 * 管理扫描策略配置
 */
export default function ScanStrategyPage() {
  const [strategies, setStrategies] = React.useState<ScanStrategy[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // 模拟数据加载
  React.useEffect(() => {
    // TODO: 替换为实际的 API 调用
    const mockData: ScanStrategy[] = [
      {
        id: 1,
        name: "全面安全扫描",
        type: "comprehensive",
        description: "使用所有可用工具进行全面的安全扫描，覆盖子域名、端口、目录、漏洞等所有方面",
        tools: ["subfinder", "nuclei", "naabu", "httpx"],
        tool_ids: [1, 2, 3, 4],
        is_enabled: true,
        created_at: "2024-01-15T10:30:00Z",
        updated_at: "2024-01-18T14:20:00Z",
        usage_count: 25,
      },
      {
        id: 2,
        name: "快速漏洞检测",
        type: "quick",
        description: "快速检测常见漏洞，适用于日常扫描",
        tools: ["nuclei", "httpx"],
        tool_ids: [2, 4],
        is_enabled: true,
        created_at: "2024-01-10T09:15:00Z",
        updated_at: "2024-01-16T11:45:00Z",
        usage_count: 48,
      },
      {
        id: 3,
        name: "子域名发现专项",
        type: "custom",
        description: "专注于子域名枚举和发现",
        tools: ["subfinder", "dnsx"],
        tool_ids: [1, 5],
        is_enabled: true,
        created_at: "2024-01-12T16:00:00Z",
        updated_at: "2024-01-17T09:30:00Z",
        usage_count: 15,
      },
      {
        id: 4,
        name: "Web应用扫描",
        type: "custom",
        description: "针对Web应用的全面扫描，包括目录扫描、漏洞检测等",
        tools: ["nuclei", "httpx", "katana"],
        tool_ids: [2, 4, 6],
        is_enabled: false,
        created_at: "2024-01-08T14:20:00Z",
        updated_at: "2024-01-15T16:10:00Z",
        usage_count: 8,
      },
      {
        id: 5,
        name: "端口服务识别",
        type: "custom",
        description: "识别开放端口和运行的服务",
        tools: ["naabu", "httpx"],
        tool_ids: [3, 4],
        is_enabled: true,
        created_at: "2024-01-14T11:00:00Z",
        updated_at: "2024-01-19T08:15:00Z",
        usage_count: 32,
      },
    ]

    setTimeout(() => {
      setStrategies(mockData)
      setIsLoading(false)
    }, 500)
  }, [])

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 查看策略详情
  const handleView = (strategy: ScanStrategy) => {
    toast.info(`查看策略: ${strategy.name}`)
    // TODO: 导航到详情页
    // router.push(`/scan/strategy/${strategy.id}`)
  }

  // 编辑策略
  const handleEdit = (strategy: ScanStrategy) => {
    toast.info(`编辑策略: ${strategy.name}`)
    // TODO: 打开编辑对话框或导航到编辑页面
  }

  // 删除策略
  const handleDelete = React.useCallback((strategy: ScanStrategy) => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          setStrategies(prev => prev.filter((s) => s.id !== strategy.id))
          resolve(true)
        }, 1000)
      }),
      {
        loading: `正在删除策略: ${strategy.name}...`,
        success: "策略删除成功",
        error: "策略删除失败",
      }
    )
  }, [])

  // 处理批量删除
  const handleBulkDelete = (selectedIds: number[]) => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          setStrategies(strategies.filter((s) => !selectedIds.includes(s.id)))
          resolve(true)
        }, 1000)
      }),
      {
        loading: `正在删除 ${selectedIds.length} 个策略...`,
        success: `成功删除 ${selectedIds.length} 个策略`,
        error: "批量删除失败",
      }
    )
  }

  // 添加新策略
  const handleAddNew = () => {
    toast.info("打开新建策略对话框")
    // TODO: 打开新建对话框
  }

  // 创建列定义
  const columns = React.useMemo(
    () =>
      createStrategyColumns({
        formatDate,
        handleView,
        handleEdit,
        handleDelete,
      }),
    [handleDelete]
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-3xl font-bold">扫描策略</h1>
            <p className="text-muted-foreground mt-1">配置和管理扫描策略</p>
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
          <h1 className="text-3xl font-bold">扫描策略</h1>
          <p className="text-muted-foreground mt-1">配置和管理扫描策略</p>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="px-4 lg:px-6">
        <StrategyDataTable
          data={strategies}
          columns={columns}
          onAddNew={handleAddNew}
          onBulkDelete={handleBulkDelete}
          searchPlaceholder="搜索策略名称..."
          searchColumn="name"
          addButtonText="新建策略"
        />
      </div>
    </div>
  )
}
