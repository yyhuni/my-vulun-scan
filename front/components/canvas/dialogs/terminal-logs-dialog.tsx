'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Terminal,
  Search,
  Download,
  Copy,
  Trash2,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnsiUp } from 'ansi_up';

// 日志条目类型
export interface LogEntry {
  id: string
  timestamp: string
  message: string
  data?: any
}

// 组件属性
export interface TerminalLogDialogProps {
  isOpen: boolean
  onClose: () => void
  logs: LogEntry[]
  title?: string
  nodeId?: string
  onClearLogs?: () => void
  className?: string
}

// 终端输出样式配置
const terminalConfig = {
  textColor: 'text-green-400', // 经典终端绿色
  timestampColor: 'text-gray-500',
  backgroundColor: 'bg-black'
}

export function TerminalLogDialog({
  isOpen,
  onClose,
  logs,
  title = "节点终端输出",
  nodeId,
  onClearLogs,
  className
}: TerminalLogDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  // 新增 ansi_up 实例
  const ansi_up = new AnsiUp();

  // 过滤日志
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === '' ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [filteredLogs, autoScroll])

  // 复制所有日志
  const handleCopyLogs = () => {
    const logText = filteredLogs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      return `[${timestamp}] ${log.message}`
    }).join('\n')

    navigator.clipboard.writeText(logText)
  }

  // 导出日志
  const handleExportLogs = () => {
    const logText = filteredLogs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString()
      return `${timestamp} ${log.message}`
    }).join('\n')

    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `node-${nodeId || 'unknown'}-terminal-output-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-6xl h-[90vh] flex flex-col p-0 gap-0",
        isFullscreen && "max-w-[95vw] h-[95vh]",
        className
      )}>
        {/* 头部 */}
        <DialogHeader className="flex flex-row items-center justify-between p-4 border-b bg-gray-900 text-white rounded-t-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg">{title}</DialogTitle>
              <DialogDescription className="text-gray-300 text-sm">
                共 {filteredLogs.length} 行终端输出
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-white hover:bg-gray-800"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </DialogHeader>

        {/* 工具栏 */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 space-x-4">
          {/* 搜索 */}
          <div className="flex items-center space-x-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜索终端输出内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className={cn(autoScroll && "bg-blue-50 text-blue-600")}
            >
              自动滚动
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLogs}
            >
              <Copy className="h-4 w-4 mr-2" />
              复制
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportLogs}
            >
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearLogs}
              className="hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              清空
            </Button>
          </div>
        </div>

        {/* 日志内容区域 */}
        <div className="flex-1 bg-black p-4 font-mono text-sm overflow-hidden">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="space-y-1">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const timestamp = new Date(log.timestamp).toLocaleTimeString('zh-CN', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    fractionalSecondDigits: 3
                  })

                  return (
                    <div key={log.id} className="flex items-start text-xs hover:bg-gray-900/50 p-1 rounded">
                      <span className={cn("mr-3 whitespace-nowrap font-mono", terminalConfig.timestampColor)}>
                        [{timestamp}]
                      </span>
                      <span className={cn("break-all font-mono text-gray-100")}
                        style={{ color: '#e5e7eb' }}
                        dangerouslySetInnerHTML={{ __html: ansi_up.ansi_to_html(log.message) }}
                      />
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <Terminal className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-lg mb-2">暂无终端输出</p>
                  <p className="text-sm text-gray-400">
                    {searchQuery
                      ? '没有匹配的输出内容，请调整搜索条件'
                      : '节点执行后将显示终端输出内容'
                    }
                  </p>
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
