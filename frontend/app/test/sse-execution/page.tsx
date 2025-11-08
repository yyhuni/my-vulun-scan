"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IconPlayerPlay, IconPlayerStop, IconTrash, IconRefresh } from "@tabler/icons-react"

interface SSEEvent {
  id?: string
  type: string
  data: Record<string, unknown>
  timestamp: string
}

export default function SSEExecutionTestPage() {
  const [toolId, setToolId] = useState("1")
  const [commandId, setCommandId] = useState("1")
  const [params, setParams] = useState('{"target": "http://example.com"}')
  const [executionId, setExecutionId] = useState<number | null>(null)
  const [events, setEvents] = useState<SSEEvent[]>([])
  const [status, setStatus] = useState<string>("idle")
  const [isConnected, setIsConnected] = useState(false)
  
  const eventSourceRef = useRef<EventSource | null>(null)

  // 清理 SSE 连接
  const closeSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      closeSSE()
    }
  }, [])

  // 启动执行
  const handleStartExecution = async () => {
    try {
      setEvents([])
      setStatus("starting")
      
      // 解析参数
      let parsedParams = {}
      try {
        parsedParams = JSON.parse(params)
      } catch {
        addEvent({
          type: "error",
          data: { message: "参数格式错误，请使用有效的 JSON 格式" },
          timestamp: new Date().toISOString()
        })
        setStatus("error")
        return
      }

      // 调用启动接口
      const response = await fetch(`http://localhost:8888/api/v1/tools/${toolId}/executions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command_id: parseInt(commandId),
          parameters: parsedParams,
        }),
      })

      const result = await response.json()
      
      if (result.state === "success" && result.data?.execution) {
        const execId = result.data.execution.id
        setExecutionId(execId)
        setStatus("running")
        
        addEvent({
          type: "system",
          data: { message: `执行已创建，ID: ${execId}` },
          timestamp: new Date().toISOString()
        })

        // 连接 SSE
        connectSSE(execId)
      } else {
        addEvent({
          type: "error",
          data: { message: result.message || "启动失败" },
          timestamp: new Date().toISOString()
        })
        setStatus("error")
      }
    } catch (error) {
      addEvent({
        type: "error",
        data: { message: `启动失败: ${error}` },
        timestamp: new Date().toISOString()
      })
      setStatus("error")
    }
  }

  // 连接 SSE
  const connectSSE = (execId: number) => {
    closeSSE()

    const url = `http://localhost:8888/api/v1/executions/${execId}/stream`
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      addEvent({
        type: "system",
        data: { message: "SSE 连接已建立" },
        timestamp: new Date().toISOString()
      })
    }

    eventSource.onerror = (error) => {
      console.error("SSE 错误:", error)
      addEvent({
        type: "error",
        data: { message: "SSE 连接错误" },
        timestamp: new Date().toISOString()
      })
      setIsConnected(false)
      closeSSE()
    }

    // 监听不同类型的事件
    const eventTypes = ["started", "log", "progress", "completed", "failed", "canceled"]
    
    eventTypes.forEach(eventType => {
      eventSource.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          const messageEvent = e as MessageEvent & { lastEventId?: string }
          addEvent({
            id: messageEvent.lastEventId,
            type: eventType,
            data: data,
            timestamp: new Date().toISOString()
          })

          // 更新状态
          if (eventType === "started") {
            setStatus("running")
          } else if (eventType === "completed") {
            setStatus("completed")
            closeSSE()
          } else if (eventType === "failed") {
            setStatus("failed")
            closeSSE()
          } else if (eventType === "canceled") {
            setStatus("canceled")
            closeSSE()
          }
        } catch (error) {
          console.error("解析事件数据失败:", error)
        }
      })
    })
  }

  // 取消执行
  const handleCancelExecution = async () => {
    if (!executionId) return

    try {
      const response = await fetch(`http://localhost:8888/api/v1/executions/${executionId}/cancel`, {
        method: "POST",
      })

      const result = await response.json()
      
      if (result.state === "success") {
        addEvent({
          type: "system",
          data: { message: "取消请求已发送" },
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      addEvent({
        type: "error",
        data: { message: `取消失败: ${error}` },
        timestamp: new Date().toISOString()
      })
    }
  }

  // 获取执行详情
  const handleGetExecution = async () => {
    if (!executionId) return

    try {
      const response = await fetch(`http://localhost:8888/api/v1/executions/${executionId}`)
      const result = await response.json()
      
      if (result.state === "success") {
        addEvent({
          type: "system",
          data: { 
            message: "执行详情", 
            execution: result.data.execution 
          },
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      addEvent({
        type: "error",
        data: { message: `获取详情失败: ${error}` },
        timestamp: new Date().toISOString()
      })
    }
  }

  // 添加事件到列表
  const addEvent = (event: SSEEvent) => {
    setEvents(prev => [...prev, event])
  }

  // 清空日志
  const clearLogs = () => {
    setEvents([])
  }

  // 获取状态颜色
  const getStatusColor = () => {
    switch (status) {
      case "idle": return "secondary"
      case "starting": return "default"
      case "running": return "default"
      case "completed": return "default"
      case "failed": return "destructive"
      case "canceled": return "secondary"
      case "error": return "destructive"
      default: return "secondary"
    }
  }

  // 获取事件类型颜色
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "started": return "bg-green-100 text-green-800 border-green-300"
      case "log": return "bg-blue-100 text-blue-800 border-blue-300"
      case "progress": return "bg-purple-100 text-purple-800 border-purple-300"
      case "completed": return "bg-green-100 text-green-800 border-green-300"
      case "failed": return "bg-red-100 text-red-800 border-red-300"
      case "canceled": return "bg-gray-100 text-gray-800 border-gray-300"
      case "system": return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "error": return "bg-red-100 text-red-800 border-red-300"
      default: return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">SSE + 命令执行测试</h1>
        <p className="text-muted-foreground">
          测试后端的 Server-Sent Events 和命令执行功能
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：控制面板 */}
        <div className="space-y-6">
          {/* 执行参数 */}
          <Card>
            <CardHeader>
              <CardTitle>执行参数</CardTitle>
              <CardDescription>
                配置工具执行所需的参数
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="toolId">工具 ID</Label>
                  <Input
                    id="toolId"
                    value={toolId}
                    onChange={(e) => setToolId(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commandId">命令 ID</Label>
                  <Input
                    id="commandId"
                    value={commandId}
                    onChange={(e) => setCommandId(e.target.value)}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="params">参数 (JSON)</Label>
                <Textarea
                  id="params"
                  value={params}
                  onChange={(e) => setParams(e.target.value)}
                  placeholder='{"target": "http://example.com"}'
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* 控制按钮 */}
          <Card>
            <CardHeader>
              <CardTitle>操作控制</CardTitle>
              <CardDescription>
                启动、取消和查询执行状态
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium">状态:</span>
                <Badge variant={getStatusColor()}>{status}</Badge>
                {isConnected && (
                  <Badge variant="outline" className="bg-chart-4/10 text-chart-4 border-chart-4/20 hover:bg-chart-4/20">
                    SSE 已连接
                  </Badge>
                )}
                {executionId && (
                  <Badge variant="outline">执行 ID: {executionId}</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleStartExecution}
                  disabled={status === "running" || status === "starting"}
                  className="flex-1"
                >
                  <IconPlayerPlay className="w-4 h-4 mr-2" />
                  启动执行
                </Button>

                <Button
                  onClick={handleCancelExecution}
                  disabled={!executionId || status !== "running"}
                  variant="destructive"
                  className="flex-1"
                >
                  <IconPlayerStop className="w-4 h-4 mr-2" />
                  取消执行
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleGetExecution}
                  disabled={!executionId}
                  variant="outline"
                  className="flex-1"
                >
                  <IconRefresh className="w-4 h-4 mr-2" />
                  获取详情
                </Button>

                <Button
                  onClick={clearLogs}
                  variant="outline"
                  className="flex-1"
                >
                  <IconTrash className="w-4 h-4 mr-2" />
                  清空日志
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 接口说明 */}
          <Card>
            <CardHeader>
              <CardTitle>接口说明</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">POST</Badge>
                  <code className="text-xs break-all">/api/v1/tools/:id/executions</code>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">GET</Badge>
                  <code className="text-xs break-all">/api/v1/executions/:id/stream</code>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">GET</Badge>
                  <code className="text-xs break-all">/api/v1/executions/:id</code>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">POST</Badge>
                  <code className="text-xs break-all">/api/v1/executions/:id/cancel</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：事件日志 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>事件日志</CardTitle>
            <CardDescription>
              实时显示 SSE 事件流 ({events.length} 条事件)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] w-full rounded border p-4">
              {events.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  暂无事件，点击&quot;启动执行&quot;开始测试
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event: SSEEvent, index: number) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 space-y-2 bg-card"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={getEventTypeColor(event.type)}
                        >
                          {event.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {event.id && (
                        <div className="text-xs text-muted-foreground">
                          ID: {event.id}
                        </div>
                      )}
                      
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
