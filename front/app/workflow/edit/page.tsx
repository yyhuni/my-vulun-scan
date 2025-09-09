'use client';

import React, { useState, useCallback } from 'react'
import { WorkflowEditor } from '@/components/canvas/core/canvas-workflow-editor'
import ToolLibrary from '@/components/canvas/core/component-palette'
import { ExecutionLogs } from '@/components/canvas/panels/execution-logs-panel'
import { NodeDetail } from '@/components/canvas/panels/node-detail-panel'
import { useWorkflowLogs } from '@/components/canvas/hooks/use-workflow-logs'
import { WorkflowComponentsProvider } from '@/components/canvas/components-context'
import { NodeRunningStatus, type WorkflowVariable } from '@/components/canvas/libs/types'
import AppLayout from '@/components/layout/app-layout'
import { useWorkflow } from '@/components/canvas/hooks/use-workflow'


export default function WorkflowEditPage() {
  const [showLogs, setShowLogs] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showNodeDetail, setShowNodeDetail] = useState(false)
  const workflowLogs = useWorkflowLogs()
  const workflow = useWorkflow()
  const addLog = workflowLogs.addLog

  // 处理节点选中
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId)
    setShowNodeDetail(!!nodeId) // 当选中节点时显示详情面板
  }, [])

  // 处理日志开关
  const handleLogToggle = useCallback(() => {
    setShowLogs(!showLogs)
  }, [])

  // 处理关闭节点详情面板
  const handleCloseNodeDetail = useCallback(() => {
    setShowNodeDetail(false)
    setSelectedNodeId(null)
  }, [])

  // 处理节点操作
  const handleNodeAction = useCallback((action: 'start' | 'stop' | 'restart', nodeId: string) => {
    const node = workflow.nodes.find(n => n.id === nodeId)
    if (!node) return

    const nodeName = node.title

    switch (action) {
      case 'start':
        workflow.updateNodeWithEdges(nodeId, { runningStatus: NodeRunningStatus.Running })
        addLog('info', `手动启动节点: ${nodeName}`, nodeId, nodeName)
        setTimeout(() => {
          const success = Math.random() > 0.2
          workflow.updateNodeWithEdges(nodeId, { runningStatus: success ? NodeRunningStatus.Succeeded : NodeRunningStatus.Failed })
          addLog(success ? 'success' : 'error', `节点 ${nodeName} ${success ? '执行成功' : '执行失败'}`, nodeId, nodeName)
        }, 2000)
        break
      case 'stop':
        workflow.updateNodeWithEdges(nodeId, { runningStatus: NodeRunningStatus.NotStart })
        addLog('warning', `停止节点: ${nodeName}`, nodeId, nodeName)
        break
      case 'restart':
        workflow.updateNodeWithEdges(nodeId, { runningStatus: NodeRunningStatus.Running })
        addLog('info', `重启节点: ${nodeName}`, nodeId, nodeName)
        setTimeout(() => {
          const success = Math.random() > 0.2
          workflow.updateNodeWithEdges(nodeId, { runningStatus: success ? NodeRunningStatus.Succeeded : NodeRunningStatus.Failed })
          addLog(success ? 'success' : 'error', `节点 ${nodeName} 重启${success ? '成功' : '失败'}`, nodeId, nodeName)
        }, 1500)
        break
    }
  }, [workflow, addLog])

  // 处理节点删除
  const handleNodeDelete = useCallback((nodeId: string) => {
    const node = workflow.nodes.find(n => n.id === nodeId)
    if (node) {
      workflow.deleteNode(nodeId)
      addLog('warning', `删除节点: ${node.title}`, nodeId, node.title)
      handleCloseNodeDetail()
    }
  }, [workflow, addLog, handleCloseNodeDetail])

  // 处理常量变化
  const handleConstantsChange = useCallback((variables: WorkflowVariable[]) => {
    workflow.updateVariables(variables)
    addLog('info', `更新工作流全局变量: ${variables.length} 个变量`)

    // 发送全局变量更新事件，确保所有组件都能收到通知
    window.dispatchEvent(new CustomEvent('workflow-variables-updated', {
      detail: {
        action: 'sync',
        variables: variables,
        source: 'editor'
      }
    }))
  }, [workflow, addLog])

  // 处理节点数据更新
  const handleNodeUpdate = useCallback((nodeId: string, updates: any) => {
    const node = workflow.nodes.find(n => n.id === nodeId)
    if (node) {
      workflow.updateNodeWithEdges(nodeId, updates)
      addLog('info', `更新节点配置: ${node.title}`, nodeId, node.title)
    }
  }, [workflow, addLog])

  // 获取工作流常量
  const workflowVariables = React.useMemo(() => {
    return workflow.variables || []
  }, [workflow.variables])

  // 自定义面包屑
  const breadcrumbItems = [
    { name: '工作流', href: '/workflow/overview' },
    { name: '创建工作流', current: true },
  ]

  return (
    <WorkflowComponentsProvider>
      <AppLayout breadcrumbItems={breadcrumbItems} noPadding={true}>
        <div className="h-full w-full flex">
          {/* 左侧工具库面板 */}
          <ToolLibrary />

          {/* 主工作流编辑器 */}
          <div className="flex-1 relative">
            <WorkflowEditor
              workflow={workflow}
              onNodeSelect={handleNodeSelect}
              onLogToggle={handleLogToggle}
            />
          </div>
        </div>

        {/* 工作流日志面板 */}
        <ExecutionLogs
          isOpen={showLogs}
          onClose={() => setShowLogs(false)}
          logs={workflowLogs.logs}
          onClearLogs={workflowLogs.clearLogs}
          workflowStatus="idle"
          nodeStats={{ total: 0, completed: 0, failed: 0, running: 0 }}
          isNodeDetailPanelOpen={showNodeDetail}
        />

        {/* 节点详情面板 */}
        <NodeDetail
          node={selectedNodeId ? workflow.nodes.find(n => n.id === selectedNodeId) || null : null}
          isOpen={showNodeDetail}
          onClose={handleCloseNodeDetail}
          onConstantsChange={handleConstantsChange}
          onNodeUpdate={handleNodeUpdate}
          workflowConstants={workflowVariables}
          allNodes={workflow.nodes}
        />
      </AppLayout>
    </WorkflowComponentsProvider>
  )
}