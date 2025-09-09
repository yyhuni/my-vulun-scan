/**
 * 工作流主钩子 - 管理工作流的状态和操作
 * 这是工作流系统的核心状态管理钩子
 * 
 * 主要功能：
 * - 节点和边的CRUD操作
 * - React Flow集成（位置变化、选择状态等）
 * - 工作流执行状态管理
 * - 运行时状态同步（节点与连接线）
 */

'use client'

import { useState, useCallback } from 'react'
import {
  type SecurityNode,
  type SecurityEdge,
  type NodeChange,
  type EdgeChange,
} from '@/components/canvas/libs/types'
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react' // 导入 applyNodeChanges 和 applyEdgeChanges

/**
 * 工作流状态接口定义
 */
export interface UseWorkflowState {
  /** 工作流中的所有节点 */
  nodes: SecurityNode[]
  /** 工作流中的所有连接线 */
  edges: SecurityEdge[]
  /** 当前选中的节点ID，null表示未选中任何节点 */
  selectedNodeId: string | null
  /** 工作流是否正在执行中 */
  isExecuting: boolean
  /** 工作流全局变量 */
  variables: Array<{
    name: string
    value: string
    type: 'file_path' | 'number' | 'string'
  }>
}

/**
 * 工作流操作接口定义
 */
export interface UseWorkflowActions {
  // 核心状态更新 (React Flow 事件)
  /** React Flow节点变化处理器 - 处理拖拽、选择、删除等操作 */
  onNodesChange: (changes: NodeChange[]) => void
  /** React Flow边变化处理器 - 处理连接线的选择、删除等操作 */
  onEdgesChange: (changes: EdgeChange[]) => void

  // 节点操作
  /** 添加新节点到工作流 */
  addNode: (node: SecurityNode) => void
  /** 更新单个节点的属性（不影响连接线） */
  updateNode: (nodeId: string, updates: any) => void
  /** 更新节点并同时更新相关连接线状态（用于运行时状态同步） */
  updateNodeWithEdges: (nodeId: string, updates: any) => void
  /** 删除节点及其相关连接线 */
  deleteNode: (nodeId: string) => void
  
  // 边操作
  /** 添加新的连接线 */
  addEdge: (edge: SecurityEdge) => void
  /** 更新连接线属性 */
  updateEdge: (edgeId: string, updates: any) => void
  /** 删除指定的连接线 */
  deleteEdge: (edgeId: string) => void
  
  // 选择操作
  /** 选择或取消选择节点 */
  selectNode: (nodeId: string | null) => void
  
  // 工作流操作
  /** 保存当前工作流 */
  saveWorkflow: () => Promise<void>
  /** 执行当前工作流 */
  executeWorkflow: () => Promise<void>
  /** 清空工作流，重置所有状态 */
  clearWorkflow: () => void
  /** 批量设置节点和边 */
  setWorkflowData: (nodes: SecurityNode[], edges: SecurityEdge[]) => void

  // 变量操作
  /** 更新工作流全局变量 */
  updateVariables: (variables: Array<{ name: string; value: string; type: 'file_path' | 'number' | 'string' }>) => void
}

export interface UseWorkflowReturn extends UseWorkflowState, UseWorkflowActions {}

/**
 * 工作流管理钩子
 * @param initialNodes 初始节点列表（可选）
 * @param initialEdges 初始连接线列表（可选）
 * @returns 工作流状态和操作方法
 */
export function useWorkflow(initialNodes: SecurityNode[] = [], initialEdges: SecurityEdge[] = []): UseWorkflowReturn {
  // 初始化工作流状态
  const [state, setState] = useState<UseWorkflowState>({
    nodes: initialNodes,
    edges: initialEdges,
    selectedNodeId: null,
    isExecuting: false,
    variables: [],
  })

  /**
   * React Flow 节点变化处理器
   * 处理拖拽位置变化、选择状态变化、删除操作等
   */
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setState(prev => ({
      ...prev,
      nodes: applyNodeChanges(changes, prev.nodes) as SecurityNode[],
    }))
  }, [])

  /**
   * React Flow 边变化处理器
   * 处理连接线的选择状态变化、删除操作等
   */
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setState(prev => ({
      ...prev,
      edges: applyEdgeChanges(changes, prev.edges) as SecurityEdge[],
    }))
  }, [])

  /**
   * 添加节点到工作流
   * 直接添加新节点到节点列表中
   */
  const addNode = useCallback((node: SecurityNode) => {
    setState(prev => {
      // 检查节点ID是否已存在
      const nodeExists = prev.nodes.some(existingNode => existingNode.id === node.id)
      if (nodeExists) {
        console.warn(`节点 ${node.id} 已存在，跳过添加`)
        return prev
      }
      
      return {
        ...prev,
        nodes: [...prev.nodes, node]
      }
    })
  }, [])

  /**
   * 更新节点属性（不影响连接线）
   * 主要用于更新节点位置、配置等不影响运行状态的属性
   */
  const updateNode = useCallback((nodeId: string, updates: any) => {
    setState(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => {
        if (node.id === nodeId) {
          // 如果更新包含 position 或 selected，直接在节点级别更新
          if (updates.position !== undefined || updates.selected !== undefined) {
            return { ...node, ...updates } as SecurityNode
          }
          
          // 否则更新 data 属性
          return {
            ...node,
            data: { ...node.data, ...updates }
          } as SecurityNode
        }
        return node
      })
    }))
  }, [])

  /**
   * 更新边状态
   * 直接更新指定边的data属性
   */
  const updateEdge = useCallback((edgeId: string, updates: any) => {
    setState(prev => ({
      ...prev,
      edges: prev.edges.map(edge => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            data: { ...edge.data, ...updates }
          } as SecurityEdge
        }
        return edge
      })
    }))
  }, [])

  /**
   * 更新节点并同时更新相关连接线的状态
   * 主要用于工作流执行时的状态同步
   * 
   * 功能特性：
   * - 更新节点状态的同时，同步更新从该节点出发的所有连接线状态
   * - 确保UI动画效果（如连接线流动动画）能正确触发
   */
  const updateNodeWithEdges = useCallback((nodeId: string, updates: any) => {
    setState(prev => {
      // 更新节点
      const updatedNodes = prev.nodes.map(node => {
        if (node.id === nodeId) {
          // 如果更新包含 position 或 selected，直接在节点级别更新
          if (updates.position !== undefined || updates.selected !== undefined) {
            return { ...node, ...updates } as SecurityNode
          }
          
          // 否则更新 data 属性
          return {
            ...node,
            data: { ...node.data, ...updates }
          } as SecurityNode
        }
        return node
      })

      // 如果更新了运行状态，同时更新相关连接线
      // 这确保了连接线动画能正确触发
      const updatedEdges = updates.runningStatus !== undefined
        ? prev.edges.map(edge => {
            // 更新从该节点出发的连接线
            if (edge.source === nodeId) {
              return {
                ...edge,
                data: {
                  ...edge.data,
                  runningStatus: updates.runningStatus
                }
              } as SecurityEdge
            }
            return edge
          })
        : prev.edges

      return {
        ...prev,
        nodes: updatedNodes,
        edges: updatedEdges
      }
    })
  }, [])

  /**
   * 删除节点及其相关连接线
   * 同时清理相关的选择状态
   */
  const deleteNode = useCallback((nodeId: string) => {
    setState(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      // 同时删除与该节点相关的所有连接线
      edges: prev.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId),
      // 如果删除的是当前选中的节点，清除选择状态
      selectedNodeId: prev.selectedNodeId === nodeId ? null : prev.selectedNodeId
    }))
  }, [])

  /**
   * 添加连接线到工作流
   * 直接添加新连接线到边列表中
   */
  const addEdge = useCallback((edge: SecurityEdge) => {
    setState(prev => ({
      ...prev,
      edges: [...prev.edges, edge]
    }))
  }, [])

  /**
   * 删除指定的连接线
   * 从边列表中移除指定ID的连接线
   */
  const deleteEdge = useCallback((edgeId: string) => {
    setState(prev => ({
      ...prev,
      edges: prev.edges.filter(edge => edge.id !== edgeId)
    }))
  }, [])

  /**
   * 选择或取消选择节点
   * 注意：React Flow 的选择状态主要由 onNodesChange 通过 select change type 管理
   * 这个方法主要用于外部控制选择状态
   */
  const selectNode = useCallback((nodeId: string | null) => {
    setState(prev => ({ ...prev, selectedNodeId: nodeId }))
  }, [])

  /**
   * 保存当前工作流
   * TODO: 实现实际的保存逻辑
   */
  const saveWorkflow = useCallback(async () => {
    // 移除调试日志 - 保存工作流
  }, [state.nodes, state.edges])

  /**
   * 执行当前工作流
   * TODO: 实现实际的工作流执行逻辑
   */
  const executeWorkflow = useCallback(async () => {
    setState(prev => ({ ...prev, isExecuting: true }))
    // 移除调试日志 - 开始执行工作流
    await new Promise(resolve => setTimeout(resolve, 1000)) // 模拟执行
    setState(prev => ({ ...prev, isExecuting: false }))
  }, []) // 移除不必要的依赖

  /**
   * 清空工作流，重置所有状态
   * 用于创建新工作流或重置当前工作流
   */
  const clearWorkflow = useCallback(() => {
    setState(prev => ({
      ...prev,
      nodes: [],
      edges: [],
      selectedNodeId: null,
      isExecuting: false,
      variables: [],
    }))
  }, [])

  /**
   * 批量设置节点和边
   * 用于从API加载工作流数据时一次性设置所有节点和边
   */
  const setWorkflowData = useCallback((nodes: SecurityNode[], edges: SecurityEdge[]) => {
    setState(prev => ({
      ...prev,
      nodes,
      edges,
      selectedNodeId: null,
      isExecuting: false,
    }))
  }, [])

  /**
   * 更新工作流全局变量
   */
  const updateVariables = useCallback((variables: Array<{ name: string; value: string; type: 'file_path' | 'number' | 'string' }>) => {
    setState(prev => ({
      ...prev,
      variables,
    }))
  }, [])

  // 返回状态和操作方法
  return {
    ...state,
    onNodesChange,
    onEdgesChange,
    addNode,
    updateNode,
    updateNodeWithEdges,
    deleteNode,
    addEdge,
    updateEdge,
    deleteEdge,
    selectNode,
    saveWorkflow,
    executeWorkflow,
    clearWorkflow,
    setWorkflowData,
    updateVariables,
  }
} 