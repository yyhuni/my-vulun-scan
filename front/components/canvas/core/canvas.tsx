// React Flow 工作流画布组件 - 完整实现
// 参考 Dify 工作流系统架构

'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  ConnectionMode,
  SelectionMode,
  MarkerType,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { cn } from '@/lib/utils'

// UI 组件
import { Button } from '@/components/ui'

// 图标
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  LayoutGrid, 
  Play, 
  Square, 
  Save, 
  FileText,
  Trash2
} from 'lucide-react'

import {
  SecurityToolBlockEnum,
  NodeRunningStatus,
} from '@/components/canvas/libs/types'
import type { SecurityNode, SecurityEdge } from '@/components/canvas/libs/types'
import { createNodeByType } from '@/components/workflow/lib/node-factory'

// 节点组件
import {
  WorkflowStartNode,
  WorkflowEndNode,
  CustomToolNode,
} from '../node-collection'

// 边组件
import { WorkflowEdge } from '@/components/canvas/edge'

// 节点包装组件 - 从完整节点对象中获取 title
const WrappedWorkflowStartNode = (nodeProps: any) => {
  const title = nodeProps.title || nodeProps.data?.title || '开始'
  return <WorkflowStartNode {...nodeProps} title={title} />
}

const WrappedWorkflowEndNode = (nodeProps: any) => {
  const title = nodeProps.title || nodeProps.data?.title || '结束'
  return <WorkflowEndNode {...nodeProps} title={title} />
}

const WrappedCustomToolNode = (nodeProps: any) => {
  const title = nodeProps.title || nodeProps.data?.title || '自定义工具'
  return <CustomToolNode {...nodeProps} title={title} />
}

// 节点类型注册 - 参考 Dify 的 nodeTypes（移到组件外部以避免重新创建）
const NODE_TYPES = {
  [SecurityToolBlockEnum.Start]: WrappedWorkflowStartNode,
  [SecurityToolBlockEnum.End]: WrappedWorkflowEndNode,
  [SecurityToolBlockEnum.CustomTool]: WrappedCustomToolNode,
}

// 边类型注册（移到组件外部以避免重新创建）
const EDGE_TYPES = {
  'security-edge': WorkflowEdge,
  'edge': WorkflowEdge, // 支持新的简化边类型
}

// 默认边选项 - 移除箭头
const defaultEdgeOptions = {
  markerEnd: undefined, // 移除箭头
  style: {
    strokeWidth: 2,
    stroke: '#6b7280',
  },
}

// 画布组件属性
export interface CanvasProps {
  nodes?: SecurityNode[]
  edges?: SecurityEdge[]
  onNodesChange?: OnNodesChange
  onEdgesChange?: OnEdgesChange
  onConnect?: OnConnect
  onNodeClick?: (event: React.MouseEvent, node: SecurityNode) => void
  onPaneClick?: (event: React.MouseEvent) => void
  onSelectionChange?: (params: { nodes: SecurityNode[]; edges: SecurityEdge[] }) => void
  onAddNode?: (node: SecurityNode) => void
  onNodeDelete?: (nodeId: string) => void
  readOnly?: boolean
  className?: string
}



// 画布组件实现
export function Canvas({
  nodes = [],
  edges = [],
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onSelectionChange,
  onAddNode,
  onNodeDelete,
  readOnly = false,
  className,
}: CanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const [isDragOver, setIsDragOver] = useState(false)

  // 拖拽和放置处理
  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    if (event.dataTransfer.types.includes('application/reactflow')) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    if (event.dataTransfer.types.includes('application/reactflow')) {
      event.dataTransfer.dropEffect = 'move'
    }
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setIsDragOver(false)

      if (!reactFlowWrapper.current) {
        return
      }

      const type = event.dataTransfer.getData('application/reactflow')
      
      let dragData
      try {
        dragData = JSON.parse(type)
      } catch (e) {
        return // 解析失败则静默退出
      }

      if (!dragData || typeof dragData.componentId !== 'string') {
        return
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      // 使用工厂函数创建新节点
      try {
        const newNode = createNodeByType(
          dragData.componentId,
          position,
          dragData.componentData, // 传递完整的组件数据
          nodes // 传递现有节点列表用于编号
        )

        if (newNode) {
          onAddNode?.(newNode)
        }
      } catch (error) {
        console.error('创建节点失败:', error)
        // 可以在这里添加用户提示，比如 toast 通知
      }
    },
    [screenToFlowPosition, onAddNode]
  )

  // 获取组件显示名称
  const getComponentDisplayName = (componentId: string) => {
    switch (componentId) {
      case 'start': return '开始'
      case 'end': return '结束'
      default: return componentId
    }
  }

  // 连接处理 - 参考 Dify 的连接逻辑
  const handleConnect = useCallback<OnConnect>((params: Connection) => {
    if (readOnly || !params.source || !params.target) return
    onConnect?.(params)
  }, [readOnly, onConnect])

  // 节点点击处理
  const handleNodeClick = useCallback((event: React.MouseEvent, node: SecurityNode) => {
    onNodeClick?.(event, node)
  }, [onNodeClick])

  // 画布点击处理
  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    onPaneClick?.(event)
  }, [onPaneClick])

  // 为节点添加删除函数，同时保留节点根级别的所有字段
  const nodesWithDeleteHandler = useMemo(() => {
    return nodes.map(node => ({
      ...node, // 保留所有根级别字段，包括 title
      data: {
        ...node.data,
        onDelete: onNodeDelete,
        canDelete: true // 允许删除所有节点
      }
    }))
  }, [nodes, onNodeDelete])

  return (
    <div className={cn("h-full w-full bg-gray-50", className)} ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodesWithDeleteHandler}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onSelectionChange={onSelectionChange}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        selectionMode={SelectionMode.Partial}
        proOptions={{ hideAttribution: true }}
        className="workflow-canvas-custom"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={2} color="#cbd5e1" />
        
        {/* 控制栏组件已移至外部，由上层组件提供 */}

        {/* 拖拽覆盖层 */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-50/20 border-2 border-dashed border-blue-300 z-10 pointer-events-none">
            <div className="flex items-center justify-center h-full">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
                <span className="text-blue-600 font-medium">释放以创建节点</span>
              </div>
            </div>
          </div>
        )}
      </ReactFlow>
    </div>
  )
}

// 导出纯画布组件，ReactFlowProvider由上层组件管理
// 使用命名导出以保持一致性