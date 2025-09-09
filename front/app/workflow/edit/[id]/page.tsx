'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Info, X } from 'lucide-react'

// 组件导入
import AppLayout from "@/components/layout/app-layout"
import { WorkflowEditor } from "@/components/canvas/core/canvas-workflow-editor"
import { ToolLibrary } from "@/components/canvas/core/component-palette"
import { ExecutionLogs } from "@/components/canvas/panels/execution-logs-panel"

// Hooks导入
import { useWorkflow } from "@/components/canvas/hooks/use-workflow"
import { useWorkflowLogs } from "@/components/canvas/hooks/use-workflow-logs"

// Context导入
import { WorkflowComponentsProvider } from "@/components/canvas/components-context"

// API导入
import { workflowAPI, type GetWorkflowResponse } from '@/components/canvas/services/workflow-api'
import type { SecurityNode, SecurityEdge } from '@/components/canvas/libs/types'

/**
 * 工作流编辑页面 - 动态路由版本
 * 支持通过URL参数加载指定的工作流进行编辑
 * 
 * 路由格式: /workflow/edit/[id]
 * 例如: /workflow/edit/e58d477b-cf66-4fd7-ac06-a39093c7bf2a
 */
export default function WorkflowEditByIdPage() {
  // 获取URL参数
  const params = useParams()
  const workflowId = params.id as string

  // 状态管理
  const [isLoading, setIsLoading] = useState(true)
  const [workflowData, setWorkflowData] = useState<GetWorkflowResponse | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showLogPanel, setShowLogPanel] = useState(false)
  const [isInfoPanelVisible, setIsInfoPanelVisible] = useState(true)

  // 初始化工作流（先用空数据，加载完成后更新）
  const workflow = useWorkflow([], [])
  const workflowLogs = useWorkflowLogs()

  // 面包屑导航配置
  const breadcrumbItems = [
    { name: "工作流", href: "/workflow" },
    { name: "编辑器", current: true },
  ]

  // 加载工作流数据
  useEffect(() => {
    const loadWorkflow = async () => {
      if (!workflowId) {
        toast.error('工作流ID无效')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        workflowLogs.addLog('info', `正在加载工作流: ${workflowId}`)
        
        console.log('=== 开始加载工作流 ===')
        console.log('工作流ID:', workflowId)
        
        // 调用API获取工作流数据
        const data = await workflowAPI.getWorkflow(workflowId)
        
        console.log('=== 工作流数据加载成功 ===')
        console.log('工作流数据:', data)
        
        setWorkflowData(data)
        
        // 将后端数据转换为前端格式并加载到工作流中
        if (data.workflowData?.nodes && data.workflowData?.edges) {
          const nodes = data.workflowData.nodes as SecurityNode[]
          const edges = data.workflowData.edges as SecurityEdge[]
          const variables = data.variables || []

          console.log('=== 还原工作流到编辑器 ===')
          console.log('节点数量:', nodes.length)
          console.log('连接线数量:', edges.length)
          console.log('全局变量数量:', variables.length)
          console.log('节点数据:', nodes)
          console.log('连接线数据:', edges)
          console.log('全局变量:', variables)

          // 使用批量设置方法一次性加载所有数据
          workflow.setWorkflowData(nodes, edges)

          // 加载全局变量
          workflow.updateVariables(variables)

          workflowLogs.addLog('success', `工作流 "${data.name}" 加载成功`)
          workflowLogs.addLog('info', `包含 ${nodes.length} 个节点，${edges.length} 条连接线，${variables.length} 个全局变量`)

          // 自动应用布局（因为不保存position信息）
          if (nodes.length > 0) {
            workflowLogs.addLog('info', '🎨 正在应用自动布局...')
            // 延迟执行布局，确保节点已经渲染
            setTimeout(async () => {
              try {
                const { smartLayoutNodes } = await import('@/components/workflow/lib/layout')
                const layoutedNodes = await smartLayoutNodes(workflow.nodes, workflow.edges)
                layoutedNodes.forEach(node => {
                  workflow.updateNode(node.id, { position: node.position })
                })
                workflowLogs.addLog('success', '✨ 自动布局完成')
              } catch (error) {
                workflowLogs.addLog('warning', '⚠️ 自动布局失败，使用默认位置')
                console.error('自动布局错误:', error)
              }
            }, 100)
          }
        }
        
      } catch (error) {
        console.error('加载工作流失败:', error)
        const errorMessage = error instanceof Error ? error.message : '加载失败'
        toast.error(`加载工作流失败: ${errorMessage}`)
        workflowLogs.addLog('error', `加载工作流失败: ${errorMessage}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadWorkflow()
  }, [workflowId]) // 依赖workflowId，当ID变化时重新加载

  // 事件处理函数
  const handleToolSelect = (toolName: string) => {
    // TODO: 实现工具选择逻辑
    console.log('选择工具:', toolName)
  }

  const handleSave = async (data: any) => {
    // TODO: 实现保存逻辑（更新现有工作流）
    console.log('保存工作流:', data)
  }

  const handleExecute = async (config: any) => {
    // TODO: 实现执行逻辑
    console.log('执行工作流:', config)
  }

  const handleNodeSelect = (nodeId: string | null) => {
    setSelectedNodeId(nodeId)
  }

  const handleLogToggle = () => {
    setShowLogPanel(!showLogPanel)
  }

  const handleCloseLogPanel = () => {
    setShowLogPanel(false)
  }

  // 加载中状态
  if (isLoading) {
    return (
      <AppLayout breadcrumbItems={breadcrumbItems} noPadding={true}>
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">正在加载工作流...</p>
            <p className="text-sm text-gray-400">ID: {workflowId}</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // 加载失败状态
  if (!workflowData) {
    return (
      <AppLayout breadcrumbItems={breadcrumbItems} noPadding={true}>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">工作流加载失败</h2>
            <p className="text-gray-600 mb-4">无法加载指定的工作流</p>
            <p className="text-sm text-gray-400">ID: {workflowId}</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <WorkflowComponentsProvider>
      <AppLayout breadcrumbItems={breadcrumbItems} noPadding={true}>
        <div className="h-full flex flex-col">
          {/* 工作流编辑器主界面容器 */}
          <div className="flex-1 flex overflow-hidden bg-white">
            {/* 左侧工具库 */}
            <ToolLibrary />

            {/* 右侧编辑器画布区域 */}
            <div className="flex-1 relative">
              {/* 主画布编辑器 */}
              <WorkflowEditor
                workflow={workflow}
                workflowId={workflowId}
                onNodeSelect={handleNodeSelect}
                onLogToggle={handleLogToggle}
              />

              {/* 工作流日志面板 */}
              <ExecutionLogs
                isOpen={showLogPanel}
                onClose={handleCloseLogPanel}
                logs={workflowLogs.logs}
                onClearLogs={workflowLogs.clearLogs}
                workflowStatus="idle"
                nodeStats={{ total: 0, completed: 0, failed: 0, running: 0 }}
              />

              {/* 工作流信息面板 - 支持显隐 */}
              <div className="absolute top-4 right-4 z-10">
                {isInfoPanelVisible ? (
                  <div className="w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg transition-all animate-in fade-in-0 zoom-in-95">
                    {/* Header with Close Button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 flex-shrink-0 text-gray-600" />
                        <h3
                          className="truncate font-semibold text-gray-800"
                          title={workflowData.name}
                        >
                          {workflowData.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => setIsInfoPanelVisible(false)}
                        className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                        aria-label="隐藏信息面板"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Description */}
                    <p
                      className="mt-1.5 line-clamp-2 text-xs text-gray-500"
                      title={workflowData.description || ''}
                    >
                      {workflowData.description || '暂无描述'}
                    </p>

                    {/* Separator */}
                    <hr className="my-2 border-t border-gray-200" />

                    {/* Details */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">分类</span>
                        <span className="truncate font-medium text-gray-700" title={workflowData.category}>
                          {workflowData.category}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">状态</span>
                        <span className="font-medium text-gray-700">
                          {workflowData.status}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-gray-500">创建者</span>
                        <span className="truncate font-medium text-gray-700" title={workflowData.createdBy}>
                          {workflowData.createdBy}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsInfoPanelVisible(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-gray-200 transition-all hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    aria-label="显示信息面板"
                  >
                    <Info className="h-5 w-5 text-gray-600" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    </WorkflowComponentsProvider>
  )
}
