import { useCallback, useState } from 'react'
import type { UseWorkflowReturn } from './use-workflow'
import {
  NodeRunningStatus,
  WorkflowExecutionStatus,
} from '@/components/canvas/libs/types'
import type { SecurityNode } from '../libs/types'
import { SecurityToolBlockEnum } from '../libs/types'

// 这个类型定义属于组件范畴，不应该在全局类型文件中
type WorkflowStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed'
  | 'error'

/**
 * 为节点执行过程生成详细的模拟日志
 * @param nodeName - 节点名称
 * @param nodeId - 节点ID
 * @returns 日志消息数组
 */
const generateExecutionLogs = (nodeName: string, nodeId: string): string[] => {
  return [
    `🚀 初始化 ${nodeName} 节点`,
    `🔧 检查节点配置参数`,
    `🛠️ 准备执行环境`,
    `▶️ 开始执行任务`,
    `📥 处理输入数据`,
    `⚙️ 执行核心逻辑`,
    `📤 生成输出结果`,
    `🧹 清理临时资源`,
    `✅ 节点执行完成`
  ]
}

/**
 * 封装了工作流执行逻辑的 Hook
 * @param workflow - useWorkflow Hook 的返回值
 * @param addLog - 日志记录函数
 * @returns 返回工作流执行状态和控制函数
 */
export function useWorkflowExecution(
  workflow: UseWorkflowReturn,
  addLog: (level: 'info' | 'success' | 'warning' | 'error', message: string, nodeId?: string, nodeName?: string) => void
) {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('idle')

  /**
   * ▶️ 工作流启动处理器
   */
  const handleStart = useCallback(async () => {
    addLog('info', '🚀 =============== 工作流开始执行 ===============')
    setWorkflowStatus('running')

    try {
      const nodes = workflow.nodes
      const sortedNodes = [...nodes].sort((a, b) => a.position.x - b.position.x)

      addLog('info', `📊 发现 ${sortedNodes.length} 个节点，开始按顺序执行`)

      for (let i = 0; i < sortedNodes.length; i++) {
        const node = sortedNodes[i]
        const nodeName = node.title
        const nodeId = node.id

        addLog('info', `📍 [${i + 1}/${sortedNodes.length}] 准备执行节点: ${nodeName}`, nodeId, nodeName)

        workflow.updateNodeWithEdges(node.id, {
          runningStatus: NodeRunningStatus.Running
        })
        addLog('info', `⚡ ${nodeName} 状态设置为运行中`, nodeId, nodeName)

        const executionLogs = generateExecutionLogs(nodeName, nodeId)

        for (const logMessage of executionLogs) {
          const delay = Math.random() * 300 + 100
          await new Promise(resolve => setTimeout(resolve, delay))
          addLog('info', logMessage, nodeId, nodeName)
        }

        const executionTime = Math.random() * 2000 + 1000
        addLog('info', `⏳ ${nodeName} 主要任务执行中，预计耗时 ${Math.round(executionTime / 1000)}秒`, nodeId, nodeName)
        await new Promise(resolve => setTimeout(resolve, executionTime))

        const success = Math.random() > 0.1

        if (success) {
          workflow.updateNodeWithEdges(node.id, {
            runningStatus: NodeRunningStatus.Succeeded
          })
          addLog('success', `✅ ${nodeName} 执行成功`, nodeId, nodeName)
          if (node.type === SecurityToolBlockEnum.CustomTool) {
            const resultCount = Math.floor(Math.random() * 50) + 1
            addLog('info', `🔍 发现 ${resultCount} 项扫描结果`, nodeId, nodeName)
          }
        } else {
          workflow.updateNodeWithEdges(node.id, {
            runningStatus: NodeRunningStatus.Failed
          })
          const errorMessages = ['连接超时', '权限不足', '配置错误', '资源不可用', '网络异常']
          const errorMsg = errorMessages[Math.floor(Math.random() * errorMessages.length)]
          addLog('error', `❌ ${nodeName} 执行失败: ${errorMsg}`, nodeId, nodeName)
          setWorkflowStatus('error')
          addLog('error', '🛑 工作流执行中断，已停止后续节点执行')
          return
        }

        if (i < sortedNodes.length - 1) {
          addLog('info', `➡️ 准备执行下一个节点...`)
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }

      setWorkflowStatus('completed')
      addLog('success', '🎉 工作流执行完成！所有节点均成功执行')
      addLog('info', '🏁 =============== 工作流执行结束 ===============')
    } catch (error) {
      console.error('工作流执行失败:', error)
      setWorkflowStatus('error')
      addLog('error', `💥 工作流执行异常: ${(error as Error).message}`)
      workflow.nodes.forEach(node => {
        if ((node.data as any).runningStatus === NodeRunningStatus.Running) {
          workflow.updateNodeWithEdges(node.id, {
            runningStatus: NodeRunningStatus.Failed
          })
          addLog('error', `🛑 ${node.title} 因异常中断执行`, node.id, node.title)
        }
      })
    }
  }, [workflow, addLog])

  /**
   * ⏸️ 工作流暂停处理器
   */
  const handlePause = useCallback(() => {
    setWorkflowStatus('paused')
    addLog('warning', '⏸️ 工作流已暂停')
  }, [addLog])

  /**
   * 🛑 工作流停止处理器
   */
  const handleStop = useCallback(() => {
    setWorkflowStatus('idle')
    addLog('warning', '🛑 工作流已停止，所有节点状态已重置')
    workflow.nodes.forEach(node => {
      workflow.updateNodeWithEdges(node.id, {
        runningStatus: NodeRunningStatus.NotStart
      })
      addLog('info', `🔄 ${node.title} 状态已重置`, node.id, node.title)
    })
  }, [workflow, addLog])

  return {
    workflowStatus,
    handleStart,
    handlePause,
    handleStop
  }
}
