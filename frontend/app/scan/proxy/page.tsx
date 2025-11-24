"use client"

import React from "react"
import {
  ProxyDataTable,
  createProxyColumns,
  ProxyFormDialog,
  ProxyDeleteDialog,
} from "@/components/scan/proxy"
import {
  useProxies,
  useCreateProxy,
  useUpdateProxy,
  useDeleteProxy,
  useTestProxy,
  useToggleProxyEnabled,
} from "@/hooks/use-proxies"
import type { Proxy, CreateProxyRequest, UpdateProxyRequest } from "@/types/proxy.types"

/**
 * 代理配置页面
 * 管理扫描使用的代理配置
 */
export default function ProxyConfigPage() {
  // 对话框状态
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [editingProxy, setEditingProxy] = React.useState<Proxy | null>(null)
  const [deletingProxy, setDeletingProxy] = React.useState<Proxy | null>(null)

  // React Query hooks
  const { data, isLoading } = useProxies()
  const createMutation = useCreateProxy()
  const updateMutation = useUpdateProxy()
  const deleteMutation = useDeleteProxy()
  const testMutation = useTestProxy()
  const toggleEnabledMutation = useToggleProxyEnabled()

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

  // 新建代理
  const handleAddNew = () => {
    setEditingProxy(null)
    setIsFormDialogOpen(true)
  }

  // 编辑代理
  const handleEdit = (proxy: Proxy) => {
    setEditingProxy(proxy)
    setIsFormDialogOpen(true)
  }

  // 删除代理
  const handleDelete = (proxy: Proxy) => {
    setDeletingProxy(proxy)
    setIsDeleteDialogOpen(true)
  }

  // 确认删除
  const handleConfirmDelete = () => {
    if (deletingProxy) {
      deleteMutation.mutate(deletingProxy.id)
      setIsDeleteDialogOpen(false)
      setDeletingProxy(null)
    }
  }

  // 测试代理
  const handleTest = (proxy: Proxy) => {
    testMutation.mutate({ id: proxy.id })
  }

  // 切换启用状态
  const handleToggleEnabled = (proxy: Proxy, enabled: boolean) => {
    toggleEnabledMutation.mutate({ id: proxy.id, isEnabled: enabled })
  }

  // 保存代理（创建或更新）
  const handleSave = async (data: CreateProxyRequest | UpdateProxyRequest) => {
    if (editingProxy) {
      await updateMutation.mutateAsync({ id: editingProxy.id, data })
    } else {
      await createMutation.mutateAsync(data as CreateProxyRequest)
    }
  }

  // 测试代理连接（表单内）
  const handleTestFromForm = async (data: Partial<{
    type: string
    host: string
    port: number
    username?: string
    password?: string
    testUrl?: string
  }>) => {
    await testMutation.mutateAsync({
      type: data.type as "http" | "https" | "socks4" | "socks5",
      host: data.host,
      port: data.port,
      username: data.username,
      password: data.password,
      testUrl: data.testUrl,
    })
  }

  // 创建列定义
  const columns = React.useMemo(
    () =>
      createProxyColumns({
        formatDate,
        onEdit: handleEdit,
        onDelete: handleDelete,
        onTest: handleTest,
        onToggleEnabled: handleToggleEnabled,
      }),
    []
  )

  // 获取代理列表数据
  const proxies = data?.results ?? []

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div>
            <h1 className="text-3xl font-bold">代理配置</h1>
            <p className="text-muted-foreground mt-1">
              管理扫描任务使用的代理服务器
            </p>
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
          <h1 className="text-3xl font-bold">代理配置</h1>
          <p className="text-muted-foreground mt-1">
            管理扫描任务使用的代理服务器
          </p>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="px-4 lg:px-6">
        <ProxyDataTable
          data={proxies}
          columns={columns}
          onAddNew={handleAddNew}
          searchPlaceholder="搜索代理名称..."
          searchColumn="name"
          addButtonText="新建代理"
        />
      </div>

      {/* 表单对话框（新建/编辑） */}
      <ProxyFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        proxy={editingProxy}
        onSave={handleSave}
        onTest={handleTestFromForm}
        isLoading={createMutation.isPending || updateMutation.isPending}
        isTesting={testMutation.isPending}
      />

      {/* 删除确认对话框 */}
      <ProxyDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        proxy={deletingProxy}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
