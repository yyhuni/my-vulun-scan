"use client"

import React from "react"
import { EngineDataTable, EngineEditDialog, EngineCreateDialog } from "@/components/scan/engine"
import { createEngineColumns } from "@/components/scan/engine/engine-columns"
import { useEngines, useCreateEngine, useUpdateEngine, useDeleteEngine } from "@/hooks/use-engines"
import type { ScanEngine } from "@/types/engine.types"

/**
 * 扫描引擎页面
 * 管理扫描引擎配置
 */
export default function ScanEnginePage() {
  const [editingEngine, setEditingEngine] = React.useState<ScanEngine | null>(null)
  const [isYamlDialogOpen, setIsYamlDialogOpen] = React.useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)

  // 使用 React Query 获取数据
  const { data: engines = [], isLoading } = useEngines()
  const createEngineMutation = useCreateEngine()
  const updateEngineMutation = useUpdateEngine()
  const deleteEngineMutation = useDeleteEngine()


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
    await updateEngineMutation.mutateAsync({
      id: engineId,
      data: { configuration: yamlContent },
    })
  }

  // 删除引擎
  const handleDelete = React.useCallback((engine: ScanEngine) => {
    deleteEngineMutation.mutate(engine.id)
  }, [deleteEngineMutation])

  // 添加新引擎
  const handleAddNew = () => {
    setIsCreateDialogOpen(true)
  }

  // 保存新建引擎
  const handleCreateEngine = async (name: string, yamlContent: string) => {
    await createEngineMutation.mutateAsync({
      name,
      configuration: yamlContent,
      is_default: false,
    })
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
          searchPlaceholder="搜索引擎名称..."
          searchColumn="name"
          addButtonText="新建引擎"
        />
      </div>

      {/* 编辑引擎弹窗 */}
      <EngineEditDialog
        engine={editingEngine}
        open={isYamlDialogOpen}
        onOpenChange={setIsYamlDialogOpen}
        onSave={handleSaveYaml}
      />

      {/* 新建引擎弹窗 */}
      <EngineCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={handleCreateEngine}
      />
    </div>
  )
}

