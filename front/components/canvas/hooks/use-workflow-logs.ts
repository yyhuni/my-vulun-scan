// 工作流日志管理 hook
'use client'

import { useState, useCallback } from 'react'

// 日志类型定义
export type LogLevel = 'info' | 'success' | 'warning' | 'error'

export interface WorkflowLog {
  id: string
  timestamp: Date
  time: string // 格式化的时间字符串
  level: LogLevel
  message: string
  nodeId?: string // 关联的节点ID
  nodeName?: string // 节点名称
}

export interface UseWorkflowLogsReturn {
  logs: WorkflowLog[]
  addLog: (level: LogLevel, message: string, nodeId?: string, nodeName?: string) => void
  clearLogs: () => void
  getLogsByNode: (nodeId: string) => WorkflowLog[]
  getLogsByLevel: (level: LogLevel) => WorkflowLog[]
}

export function useWorkflowLogs(): UseWorkflowLogsReturn {
  const [logs, setLogs] = useState<WorkflowLog[]>([])

  // 添加日志
  const addLog = useCallback((level: LogLevel, message: string, nodeId?: string, nodeName?: string) => {
    const now = new Date()
    const time = now.toLocaleTimeString('zh-CN', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    const newLog: WorkflowLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now,
      time,
      level,
      message,
      nodeId,
      nodeName
    }

    setLogs(prev => [...prev, newLog])
  }, [])

  // 清空日志
  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  // 根据节点ID获取日志
  const getLogsByNode = useCallback((nodeId: string) => {
    return logs.filter(log => log.nodeId === nodeId)
  }, [logs])

  // 根据日志级别获取日志
  const getLogsByLevel = useCallback((level: LogLevel) => {
    return logs.filter(log => log.level === level)
  }, [logs])

  return {
    logs,
    addLog,
    clearLogs,
    getLogsByNode,
    getLogsByLevel
  }
} 