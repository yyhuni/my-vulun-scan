'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui/badge'

import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  X, 
  Download, 
  Workflow,
  FileText,
  Trash2,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowLog } from '../hooks/use-workflow-logs'
import { AnsiUp } from 'ansi_up';

// 工作流日志面板属性
export interface ExecutionLogsProps {
  isOpen: boolean
  onClose: () => void
  logs?: WorkflowLog[]
  onClearLogs?: () => void
  className?: string
  workflowStatus?: 'idle' | 'running' | 'completed' | 'failed'
  nodeStats?: {
    total: number
    completed: number
    failed: number
    running: number
  }
  isNodeDetailPanelOpen?: boolean
}

// 工作流状态配置
const workflowStatusConfig = {
  idle: { label: '待执行', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Pause },
  running: { label: '执行中', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Play },
  completed: { label: '已完成', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle },
  failed: { label: '执行失败', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle }
}

export function ExecutionLogs({
  isOpen, 
  onClose, 
  logs = [],
  onClearLogs,
  className,
  workflowStatus = 'idle',
  nodeStats = { total: 0, completed: 0, failed: 0, running: 0 },
  isNodeDetailPanelOpen = false
}: ExecutionLogsProps) {
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // 新增 ansi_up 实例
  const ansi_up = new AnsiUp();

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  // 过滤工作流级别的日志（不包含nodeId的日志）
  const workflowLogs = logs.filter(log => !log.nodeId)
  
  // 直接使用工作流日志，不再需要搜索过滤
  const filteredLogs = workflowLogs

  // 统计日志总数
  const logStats = { total: workflowLogs.length }

  const statusConfig = workflowStatusConfig[workflowStatus]
  const StatusIcon = statusConfig.icon

  if (!isOpen) {
    return null
  }

  return (
    <div className={cn(
      "fixed top-14 h-[calc(100vh-3.5rem)] w-96 bg-white border border-gray-200 shadow-lg z-40 transform transition-all duration-300 flex flex-col rounded-lg",
      isOpen ? "translate-x-0" : "translate-x-full",
      isNodeDetailPanelOpen ? "right-96" : "right-0",
      className
    )}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
            <Workflow className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 text-sm">工作流日志</h3>
              <Badge className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700">
                <FileText className="w-3 h-3 mr-1" />
                {logStats.total || 0} 条记录
              </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-7 w-7 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 工作流状态和统计 */}
      <div className="p-3 space-y-3 flex-shrink-0">
        {/* 工作流状态卡片 */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <StatusIcon className={cn("w-4 h-4", statusConfig.color)} />
                <span className="text-sm font-medium">工作流状态</span>
              </div>
              <Badge className={cn("text-xs", statusConfig.color, statusConfig.bgColor)}>
                {statusConfig.label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 节点统计卡片 */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">已完成</p>
                <p className="text-lg font-semibold text-green-600">{nodeStats.completed}</p>
              </div>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">失败</p>
                <p className="text-lg font-semibold text-red-600">{nodeStats.failed}</p>
              </div>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
          </Card>
        </div>


      </div>

      {/* 日志列表 */}
      <div className="flex-1 flex flex-col px-3 py-2 space-y-2 min-h-0">
        <ScrollArea className="flex-1 border border-gray-200 rounded-md">
          <div className="p-3 space-y-1">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                return (
                  <div
                    key={log.id}
                    className="py-2 text-xs text-gray-700 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 font-mono text-xs whitespace-nowrap">
                        {log.time}
                      </span>
                      <div className="flex-1 break-all text-xs text-gray-100" style={{ color: '#e5e7eb' }} dangerouslySetInnerHTML={{ __html: ansi_up.ansi_to_html(log.message) }} />
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">暂无工作流日志</p>
                <p className="text-xs text-gray-400 mt-1">开始执行工作流后将显示日志信息</p>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </ScrollArea>

        {/* 操作按钮 */}
        <div className="flex space-x-1.5 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn("flex-1 text-xs", autoScroll && "bg-blue-50 text-blue-600")}
          >
            自动滚动
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onClearLogs}
            disabled={workflowLogs.length === 0}
            className="flex-1 text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            清空
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
          >
            <Download className="w-3 h-3 mr-1" />
            导出
          </Button>
        </div>
      </div>
    </div>
  )
}
