"use client"

import React from "react"
import { toast } from "sonner"
import { EngineDataTable, EngineYamlDialog } from "@/components/scan/engine"
import { createEngineColumns } from "@/components/scan/engine/engine-columns"
import type { ScanEngine } from "@/types/engine.types"

/**
 * 扫描引擎页面
 * 管理扫描引擎配置
 */
export default function ScanEnginePage() {
  const [engines, setEngines] = React.useState<ScanEngine[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [editingEngine, setEditingEngine] = React.useState<ScanEngine | null>(null)
  const [isYamlDialogOpen, setIsYamlDialogOpen] = React.useState(false)

  // 模拟数据加载
  React.useEffect(() => {
    // TODO: 替换为实际的 API 调用（从 /api/engines/ 获取）
    const mockData: ScanEngine[] = [
      {
        id: 1,
        name: "全面扫描引擎",
        type: "comprehensive",
        description: "使用所有可用工具进行全面的安全扫描，覆盖子域名、端口、目录、漏洞等所有方面",
        configuration: `subdomain_discovery:
  uses_tools: [subfinder, chaos]
  threads: 30
port_scan:
  ports: [top-100]
  threads: 30
osint:
  intensity: normal
dir_file_fuzz:
  threads: 30
fetch_url:
  uses_tools: [gospider, katana]
vulnerability_scan:
  run_nuclei: true
waf_detection: {}
screenshot:
  threads: 40`,
        tools: ["subfinder", "nuclei", "naabu", "httpx"],
        tool_ids: [1, 2, 3, 4],
        is_enabled: true,
        created_at: "2024-01-15T10:30:00Z",
        updated_at: "2024-01-18T14:20:00Z",
        usage_count: 25,
      },
      {
        id: 2,
        name: "快速扫描引擎",
        type: "quick",
        description: "快速检测常见漏洞，适用于日常扫描",
        configuration: `vulnerability_scan:
  run_nuclei: true
  intensity: normal
port_scan:
  ports: [top-20]
  passive: true`,
        tools: ["nuclei", "httpx"],
        tool_ids: [2, 4],
        is_enabled: true,
        created_at: "2024-01-10T09:15:00Z",
        updated_at: "2024-01-16T11:45:00Z",
        usage_count: 48,
      },
      {
        id: 3,
        name: "子域名发现引擎",
        type: "custom",
        description: "专注于子域名枚举和发现",
        configuration: `subdomain_discovery:
  uses_tools: [subfinder, dnsx]
  enable_http_crawl: true
  threads: 30`,
        tools: ["subfinder", "dnsx"],
        tool_ids: [1, 5],
        is_enabled: true,
        created_at: "2024-01-12T16:00:00Z",
        updated_at: "2024-01-17T09:30:00Z",
        usage_count: 15,
      },
      {
        id: 4,
        name: "Web应用扫描引擎",
        type: "custom",
        description: "针对Web应用的全面扫描，包括目录扫描、漏洞检测等",
        configuration: `dir_file_fuzz:
  extensions: [php, html, js]
  threads: 30
vulnerability_scan:
  run_nuclei: true
  run_dalfox: true
fetch_url:
  uses_tools: [katana, gospider]`,
        tools: ["nuclei", "httpx", "katana"],
        tool_ids: [2, 4, 6],
        is_enabled: false,
        created_at: "2024-01-08T14:20:00Z",
        updated_at: "2024-01-15T16:10:00Z",
        usage_count: 8,
      },
      {
        id: 5,
        name: "端口服务识别引擎",
        type: "custom",
        description: "识别开放端口和运行的服务",
        configuration: `port_scan:
  ports: [top-1000]
  rate_limit: 150
  threads: 30
  enable_nmap: true`,
        tools: ["naabu", "httpx"],
        tool_ids: [3, 4],
        is_enabled: true,
        created_at: "2024-01-14T11:00:00Z",
        updated_at: "2024-01-19T08:15:00Z",
        usage_count: 32,
      },
    ]

    setTimeout(() => {
      setEngines(mockData)
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

  // 编辑引擎
  const handleEdit = (engine: ScanEngine) => {
    setEditingEngine(engine)
    setIsYamlDialogOpen(true)
  }

  // 保存 YAML 配置
  const handleSaveYaml = async (engineId: number, yamlContent: string) => {
    // TODO: 调用 API 保存 YAML 配置
    // await updateEngineConfig(engineId, yamlContent)
    console.log("Saving YAML for engine:", engineId)
    console.log("YAML content:", yamlContent)
    
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // 删除引擎
  const handleDelete = React.useCallback((engine: ScanEngine) => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          setEngines(prev => prev.filter((e) => e.id !== engine.id))
          resolve(true)
        }, 1000)
      }),
      {
        loading: `正在删除引擎: ${engine.name}...`,
        success: "引擎删除成功",
        error: "引擎删除失败",
      }
    )
  }, [])

  // 处理批量删除
  const handleBulkDelete = (selectedIds: number[]) => {
    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          setEngines(engines.filter((e) => !selectedIds.includes(e.id)))
          resolve(true)
        }, 1000)
      }),
      {
        loading: `正在删除 ${selectedIds.length} 个引擎...`,
        success: `成功删除 ${selectedIds.length} 个引擎`,
        error: "批量删除失败",
      }
    )
  }

  // 添加新引擎
  const handleAddNew = () => {
    toast.info("打开新建引擎对话框")
    // TODO: 打开新建对话框
  }

  // 创建列定义
  const columns = React.useMemo(
    () =>
      createEngineColumns({
        formatDate,
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
            <h1 className="text-3xl font-bold">扫描引擎</h1>
            <p className="text-muted-foreground mt-1">配置和管理扫描引擎</p>
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
          <h1 className="text-3xl font-bold">扫描引擎</h1>
          <p className="text-muted-foreground mt-1">配置和管理扫描引擎</p>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="px-4 lg:px-6">
        <EngineDataTable
          data={engines}
          columns={columns}
          onAddNew={handleAddNew}
          onBulkDelete={handleBulkDelete}
          searchPlaceholder="搜索引擎名称..."
          searchColumn="name"
          addButtonText="新建引擎"
        />
      </div>

      {/* YAML 编辑弹窗 */}
      <EngineYamlDialog
        engine={editingEngine}
        open={isYamlDialogOpen}
        onOpenChange={setIsYamlDialogOpen}
        onSave={handleSaveYaml}
      />
    </div>
  )
}

