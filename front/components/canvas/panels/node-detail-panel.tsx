'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  X,
  Play,
  Square,
  RotateCcw,
  Download,
  Terminal,
  Settings,
  Info,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Trash2,
  FileCode,
  ListTree,
  Copy,
  Pencil,
  PlusCircle,
  ChevronDown,
  Maximize2,
  Code
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SecurityNode, CustomToolNodeType } from '../libs/types'
import { NodeRunningStatus } from '../libs/types'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { TerminalLogDialog } from '../dialogs/terminal-logs-dialog'
import { NodeParameterConfig, type ParameterConfig } from './node-configuration-panel'
import { ConstantsConfig } from './variable-config-panel'
import { EnhancedNodeConfig } from '../advanced-node-config'
import { useWorkflowComponents } from '../hooks/use-workflow-components'
import { AnsiUp } from 'ansi_up';
import type { WorkflowVariable } from '../libs/types'

// 节点日志条目类型
export interface NodeLogEntry {
  id: string
  timestamp: string
  message: string
  data?: any
}

// 节点详情面板属性
export interface NodeDetailProps {
  node: SecurityNode | null
  isOpen: boolean
  onClose: () => void
  className?: string
  // 新增：工作流上下文
  workflowConstants?: WorkflowVariable[]
  allNodes?: SecurityNode[]
  onConstantsChange?: (constants: WorkflowVariable[]) => void
  onNodeUpdate?: (nodeId: string, updates: any) => void // 新增：节点更新回调
}

// 运行状态映射
const statusConfig = {
  [NodeRunningStatus.NotStart]: {
    label: '未开始',
    color: 'bg-gray-100 text-gray-700',
    icon: Clock
  },
  [NodeRunningStatus.Waiting]: {
    label: '等待中',
    color: 'bg-yellow-100 text-yellow-700',
    icon: AlertCircle
  },
  [NodeRunningStatus.Running]: {
    label: '运行中',
    color: 'bg-blue-100 text-blue-700',
    icon: Loader2
  },
  [NodeRunningStatus.Succeeded]: {
    label: '已完成',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle
  },
  [NodeRunningStatus.Failed]: {
    label: '失败',
    color: 'bg-red-100 text-red-700',
    icon: XCircle
  },
  [NodeRunningStatus.Exception]: {
    label: '异常',
    color: 'bg-red-100 text-red-700',
    icon: XCircle
  }
}



export function NodeDetail({
  node,
  isOpen,
  onClose,
  className,
  workflowConstants = [],
  allNodes = [],
  onConstantsChange,
  onNodeUpdate
}: NodeDetailProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [autoScroll, setAutoScroll] = useState(true)
  const [showTerminalDialog, setShowTerminalDialog] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // 获取组件数据
  const { components } = useWorkflowComponents()

  // 参数配置状态
  const [nodeParameters, setNodeParameters] = useState<ParameterConfig[]>([])

  // 处理参数配置变化
  const handleParameterChange = (parameters: ParameterConfig[]) => {
    // 这个函数处理旧的参数配置格式
    console.log('参数配置变化:', parameters)
  }

  // 处理参数映射变化（新的增强配置）
  const handleParameterMappingChange = (mappings: any[]) => {
    if (!node || !onNodeUpdate) return

    console.log('参数映射变化:', mappings)

    // 将数组格式的参数映射转换为对象格式
    const parameterMappingsObject: any = {}
    mappings.forEach((mapping: any) => {
      if (mapping.placeholder && mapping.value) {
        parameterMappingsObject[mapping.placeholder] = {
          source: mapping.source || 'global_variable',
          value: mapping.value,
          type: mapping.type || 'string'
        }
      }
    })

    // 将参数映射保存到节点数据中（使用对象格式）
    onNodeUpdate(node.id, {
      parameter_mappings: parameterMappingsObject
    })
  }

  // 获取当前节点的组件信息
  const nodeComponent = node ? components.find(comp => comp.name === node.title) : null

  // 节点终端输出数据
  const [nodeLogs, setNodeLogs] = useState<NodeLogEntry[]>([])

  // 新增 ansi_up 实例
  const ansi_up = new AnsiUp();

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [nodeLogs, autoScroll])

  // 直接使用所有日志，不再需要过滤
  const filteredLogs = nodeLogs

  if (!isOpen || !node) {
    return null
  }

  const status = (node.data as any).runningStatus || NodeRunningStatus.NotStart
  const statusInfo = statusConfig[status as keyof typeof statusConfig]
  const StatusIcon = statusInfo.icon

  return (
    <div className={cn(
      "fixed right-0 top-14 h-[calc(100vh-3.5rem)] w-96 bg-white border border-gray-200 shadow-lg z-40 transform transition-transform duration-300 flex flex-col rounded-lg",
      isOpen ? "translate-x-0" : "translate-x-full",
      className
    )}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
            <Terminal className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 text-sm">{node.title}</h3>
              <Badge className={cn("text-xs px-2 py-0.5", statusInfo.color)}>
                <StatusIcon className={cn(
                  "w-3 h-3 mr-1",
                  (status === NodeRunningStatus.Running || status === NodeRunningStatus.Waiting) && "animate-spin"
                )} />
                {statusInfo.label}
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

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-3 mt-2">
          <TabsList className="grid w-full grid-cols-3 mb-0 h-8">
            <TabsTrigger value="overview" className="text-xs h-6 px-2">
              <Info className="w-3 h-3 mr-1" />
              概况
            </TabsTrigger>
            <TabsTrigger value="config" className="text-xs h-6 px-2">
              <Settings className="w-3 h-3 mr-1" />
              配置
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs h-6 px-2">
              <Terminal className="w-3 h-3 mr-1" />
              终端
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="overflow-y-auto">
          <div className="px-3 py-2 space-y-4">

            {/* 主要信息卡片 */}
            <Card>
              <CardContent className="p-4">
                {/* 工具标题和状态 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Terminal className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{node.title}</h3>
                      <p className="text-xs text-gray-500">{(node.data as any).category || '未分类'}</p>
                    </div>
                  </div>
                  <Badge className={cn("text-xs", statusInfo.color)}>
                    {statusInfo.label}
                  </Badge>
                </div>

                {/* 描述 */}
                <div className="mb-3">
                  <p className="text-sm text-gray-600 leading-relaxed">{node.description}</p>
                </div>

                {/* 快速信息 */}
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-gray-500 block mb-1">节点类型</span>
                    <span className="font-medium text-gray-900">{node.type}</span>
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* 技术信息卡片 - 可折叠 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Code className="w-4 h-4 mr-2" />
                  技术信息
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* 节点ID */}
                <div>
                  <span className="text-xs text-gray-500 block mb-1">节点 ID</span>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700 truncate">
                      {node.id}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(node.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* 组件ID */}
                {(() => {
                  const componentId = (node.data as any).componentId || (node.data as any).component_id;
                  if (componentId) {
                    return (
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">组件 ID</span>
                        <div className="flex items-center space-x-2">
                          <code className="flex-1 text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700 truncate">
                            {componentId}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(componentId)}
                            className="h-7 w-7 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </CardContent>
            </Card>

            {/* 输出配置卡片 - 仅结束节点显示 */}
            {(() => {
              const outputConfig = (node.data as any).output_config;
              if (outputConfig) {
                return (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <Download className="w-4 h-4 mr-2" />
                        输出配置
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 gap-3 text-xs">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <span className="text-gray-500 block mb-1">保存结果</span>
                          <span className="font-medium text-gray-900">
                            {outputConfig.save_results ? '是' : '否'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              return null;
            })()}

            {/* 命令模板卡片 */}
            {((node.data as any).command_template || (node.data as any).commandTemplate) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center">
                      <Terminal className="w-4 h-4 mr-2" />
                      命令模板
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText((node.data as any).command_template || (node.data as any).commandTemplate)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <code className="block text-xs bg-gray-100 p-3 rounded-lg font-mono text-gray-700 whitespace-pre-wrap">
                    {(node.data as any).command_template || (node.data as any).commandTemplate}
                  </code>
                </CardContent>
              </Card>
            )}

            {/* 参数映射卡片 */}
            {(node.data as any).parameter_mappings && Object.keys((node.data as any).parameter_mappings).length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center">
                    <ListTree className="w-4 h-4 mr-2" />
                    参数映射
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {Object.entries((node.data as any).parameter_mappings || {}).map(([paramName, mapping]: [string, any], index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">{`{${paramName}}`}</span>
                        <Badge variant="outline" className="text-xs">
                          {mapping.type}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="text-gray-500">映射到: </span>
                        <code className="bg-gray-100 px-1 rounded font-mono">
                          {mapping.value}
                        </code>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        <span>来源: {mapping.source === 'global_variable' ? '全局变量' : mapping.source === 'node_output' ? '节点输出' : '静态值'}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              /* 占位符信息卡片 - 当没有参数映射时显示 */
              (node.data as any).placeholders && (node.data as any).placeholders.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <ListTree className="w-4 h-4 mr-2" />
                      参数占位符
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600 mb-3">
                        此节点需要配置以下参数才能执行：
                      </p>
                      <div className="grid gap-2">
                        {((node.data as any).placeholders || []).map((placeholder: string, index: number) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-2">
                            <code className="text-xs font-medium text-blue-600">{placeholder}</code>
                            <p className="text-xs text-gray-500 mt-1">
                              需要在工作流配置中设置此参数的值
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            )}

            {/* 实际命令预览卡片 */}
            {((node.data as any).command_template || (node.data as any).commandTemplate) && (node.data as any).parameter_mappings && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center">
                      <Play className="w-4 h-4 mr-2" />
                      实际命令
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // 生成实际命令
                        let actualCommand = (node.data as any).command_template || (node.data as any).commandTemplate;
                        const parameterMappings = (node.data as any).parameter_mappings || {};

                        // 处理对象格式的参数映射
                        Object.entries(parameterMappings).forEach(([paramName, mapping]: [string, any]) => {
                          const placeholder = `{${paramName}}`;
                          actualCommand = actualCommand.replace(placeholder, mapping.value || '');
                        });

                        navigator.clipboard.writeText(actualCommand);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <code className="block text-xs bg-green-50 border border-green-200 p-3 rounded-lg font-mono text-green-800 whitespace-pre-wrap">
                    {(() => {
                      let actualCommand = (node.data as any).command_template || (node.data as any).commandTemplate;
                      const parameterMappings = (node.data as any).parameter_mappings || {};

                      // 处理对象格式的参数映射
                      Object.entries(parameterMappings).forEach(([paramName, mapping]: [string, any]) => {
                        const placeholder = `{${paramName}}`;
                        actualCommand = actualCommand.replace(placeholder, mapping.value || '');
                      });

                      return actualCommand;
                    })()}
                  </code>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 这是将参数映射应用到命令模板后的实际执行命令
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 配置标签页 */}
        <TabsContent value="config" className="overflow-y-auto">
          <div className="px-3 py-2 space-y-4">
            {/* 开始节点显示常量配置 */}
            {node.type === 'workflow-start' && (
              <ConstantsConfig
                constants={workflowConstants}
                onChange={(constants) => {
                  // 更新工作流全局变量
                  if (onConstantsChange) {
                    onConstantsChange(constants)
                  }
                }}
                allNodes={allNodes}
                onNodeUpdate={onNodeUpdate}
              />
            )}
            
            {/* 自定义工具节点显示增强参数配置 */}
            {node.type === 'custom-tool' && (
              <EnhancedNodeConfig
                node={node}
                constants={workflowConstants}
                availableNodes={allNodes}
                onParameterChange={handleParameterMappingChange}
              />
            )}
            
            {/* 其他节点使用原有配置 */}
            {node.type !== 'workflow-start' && node.type !== 'custom-tool' && (
              <NodeParameterConfig
                node={node}
                onParameterChange={handleParameterChange}
              />
            )}
          </div>
        </TabsContent>

        {/* 终端标签页 - 终端风格 */}
        <TabsContent value="logs" className="flex-1 flex flex-col px-3 py-2 space-y-2 overflow-hidden">
          {/* 终端头部操作 */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              共 {filteredLogs.length} 行终端输出
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTerminalDialog(true)}
              className="text-xs"
            >
              <Maximize2 className="w-3 h-3 mr-1" />
              全屏查看
            </Button>
          </div>

          {/* 终端日志区域 */}
          <div className="flex-1 bg-black rounded-md p-3 font-mono text-sm overflow-hidden flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => {
                    const timestamp = new Date(log.timestamp).toLocaleTimeString('zh-CN', {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })

                    return (
                      <div key={log.id} className="flex text-xs">
                        <span className="text-gray-500 mr-2 whitespace-nowrap">
                          [{timestamp}]
                        </span>
                        <span className="break-all text-gray-100" style={{ color: '#e5e7eb' }} dangerouslySetInnerHTML={{ __html: ansi_up.ansi_to_html(log.message) }} />
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Terminal className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">暂无终端输出</p>
                    <p className="text-xs text-gray-400 mt-1">节点执行后将显示终端输出内容</p>
                  </div>
                )}
                <div ref={logsEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* 日志操作 */}
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
              onClick={() => setNodeLogs([])}
              className="flex-1 text-xs"
            >
              清空日志
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
        </TabsContent>
      </Tabs>

      {/* 终端输出对话框 */}
      <TerminalLogDialog
        isOpen={showTerminalDialog}
        onClose={() => setShowTerminalDialog(false)}
        logs={nodeLogs}
        title={`${node?.title} - 终端输出`}
        nodeId={node?.id}
        onClearLogs={() => setNodeLogs([])}
      />
    </div>
  )
}
