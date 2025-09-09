'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { fetchCustomComponents } from './services/component-service'

/*
描述了一个工作流组件的结构。这个接口应该与 tool-library.tsx 中的定义保持一致，确保数据结构的一致性。
id: 组件的唯一标识符。
name: 组件的名称。
description: 组件的描述。
category?: 可选的组件分类。
placeholders: 一个字符串数组，表示组件中可能存在的占位符（例如，命令模板中的变量）。
commandTemplate: 组件执行时使用的命令行模板。
*/
export interface WorkflowComponent {
  id: string
  name: string
  description: string
  category?: string
  placeholders: string[]
  commandTemplate: string
}

/*
WorkflowComponentsContextType 接口定义了 Context 中将要提供的数据和函数。
components: 一个 WorkflowComponent 类型的数组，存储所有工作流组件。
isLoading: 一个布尔值，指示组件数据是否正在加载中。
error: 一个字符串或 null，用于存储加载过程中发生的错误信息。
refetch: 一个函数，用于手动重新获取组件数据。
*/
interface WorkflowComponentsContextType {
  components: WorkflowComponent[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const WorkflowComponentsContext = createContext<WorkflowComponentsContextType | undefined>(undefined)

interface WorkflowComponentsProviderProps {
  children: React.ReactNode
}

/**
 * 工作流组件数据提供者
 * 统一管理组件数据，避免重复请求
 */
export function WorkflowComponentsProvider({ children }: WorkflowComponentsProviderProps) {
  const [components, setComponents] = useState<WorkflowComponent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 使用ref来防止重复请求
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)

  /**
   * 从 API 获取组件数据
   */
  const fetchComponents = useCallback(async (): Promise<WorkflowComponent[]> => {
    try {
      const data = await fetchCustomComponents()
      console.log(`工作流组件数据获取成功，共 ${data.length} 个组件`)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取组件数据失败'
      console.error('获取工作流组件数据失败:', err)
      throw new Error(errorMessage)
    }
  }, [])

  /**
   * 加载组件数据（防止重复请求）
   */
  const loadComponents = useCallback(async (force = false) => {
    // 如果正在加载中，直接返回
    if (isLoadingRef.current && !force) {
      return
    }

    // 如果已经加载过且不是强制刷新，直接返回
    if (hasLoadedRef.current && !force) {
      return
    }

    try {
      isLoadingRef.current = true
      setIsLoading(true)
      setError(null)

      const data = await fetchComponents()
      setComponents(data)
      hasLoadedRef.current = true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载组件数据失败'
      setError(errorMessage)
      setComponents([])
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [fetchComponents])

  /**
   * 手动刷新数据
   */
  const refetch = useCallback(async () => {
    await loadComponents(true) // 强制刷新
  }, [loadComponents])

  // 组件挂载时加载数据
  useEffect(() => {
    loadComponents()
  }, [loadComponents])

  // 监听组件数据更新事件
  useEffect(() => {
    const handleComponentsUpdate = (event: CustomEvent) => {
      console.log('收到组件数据更新事件:', event.detail)
      // 强制刷新组件数据
      refetch()
    }

    // 监听自定义事件
    window.addEventListener('workflow-components-updated', handleComponentsUpdate as EventListener)

    // 清理事件监听器
    return () => {
      window.removeEventListener('workflow-components-updated', handleComponentsUpdate as EventListener)
    }
  }, [refetch])

  const value: WorkflowComponentsContextType = {
    components,
    isLoading,
    error,
    refetch
  }

  return (
    <WorkflowComponentsContext.Provider value={value}>
      {children}
    </WorkflowComponentsContext.Provider>
  )
}

/**
 * 使用工作流组件数据的Hook
 */
export function useWorkflowComponents(): WorkflowComponentsContextType {
  const context = useContext(WorkflowComponentsContext)
  if (context === undefined) {
    throw new Error('useWorkflowComponents must be used within a WorkflowComponentsProvider')
  }
  return context
}
