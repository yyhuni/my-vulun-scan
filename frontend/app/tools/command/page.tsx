"use client"

import { useState } from "react"
import { CommandsDataTable } from "@/components/tools/commands/commands-data-table"
import { commandColumns } from "@/components/tools/commands/commands-columns"
import { useCommands, useBatchDeleteCommands } from "@/hooks/use-commands"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"

/**
 * 命令管理页面
 * 展示和管理所有工具命令
 */
export default function CommandManagementPage() {
  const [pagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // 获取命令列表
  const { data, isLoading, error } = useCommands({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  })

  // 批量删除命令
  const batchDeleteMutation = useBatchDeleteCommands()

  const commands = data?.commands || []

  // 处理批量删除
  const handleBulkDelete = async (selectedIds: number[]) => {
    if (window.confirm(`确定要删除选中的 ${selectedIds.length} 个命令吗？`)) {
      await batchDeleteMutation.mutateAsync(selectedIds)
    }
  }

  // 处理添加新命令
  const handleAddCommand = () => {
    console.log("添加新命令")
    // TODO: 打开添加命令对话框
  }

  // 加载状态
  if (isLoading) {
    return <DataTableSkeleton toolbarButtonCount={2} rows={5} columns={4} />
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive">加载失败: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold">命令管理</h1>
        <p className="text-muted-foreground mt-1">
          管理和配置工具执行命令
        </p>
      </div>

      {/* 命令表格 */}
      <CommandsDataTable
        columns={commandColumns}
        data={commands}
        onBulkDelete={handleBulkDelete}
        onAdd={handleAddCommand}
      />
    </div>
  )
}
