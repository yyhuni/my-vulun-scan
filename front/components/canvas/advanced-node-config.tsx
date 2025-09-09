'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Settings, FileText, ChevronDown, ChevronRight, Hash } from 'lucide-react'
import type { SecurityNode, WorkflowVariable } from '../lib/types'

interface ParameterMapping {
  placeholder: string
  value: string // 变量名或节点输出引用
  type: 'file_path' | 'number' | 'string'
}

// 节点参数配置组件属性
interface EnhancedNodeConfigProps {
  node: SecurityNode
  constants: WorkflowVariable[]
  availableNodes: SecurityNode[]
  onParameterChange?: (mappings: ParameterMapping[]) => void
}

export function EnhancedNodeConfig({
  node,
  constants,
  availableNodes,
  onParameterChange
}: EnhancedNodeConfigProps) {
  const [mappings, setMappings] = useState<ParameterMapping[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0) // 用于强制重新渲染

  // 检查变量是否存在
  const isVariableExists = useCallback((variableName: string): boolean => {
    if (!variableName) return false

    // 检查是否是全局变量
    const isGlobalVariable = constants.some(variable => variable.name === variableName)
    if (isGlobalVariable) return true

    // 检查是否是其他节点的变量（格式：nodeId.variableName）
    if (variableName.includes('.')) {
      const [nodeId, varName] = variableName.split('.')
      const sourceNode = availableNodes.find(n => n.id === nodeId)
      if (sourceNode) {
        const placeholders = (sourceNode.data as any)?.placeholders || []
        return placeholders.includes(varName) || placeholders.includes(`{${varName}}`)
      }
    }

    return false
  }, [constants, availableNodes])

  // 检查参数绑定状态（与ConstantsConfig保持一致）
  const getParameterBindingStatus = useCallback((paramName: string) => {
    const nodeData = node.data as any
    const parameterMappings = nodeData?.parameter_mappings || {}
    const binding = parameterMappings[paramName]

    // 检查绑定是否存在且有有效的值（不为空字符串）
    if (binding && binding.value && binding.value.trim() !== '') {
      // 重要：检查绑定的变量是否还存在于当前变量列表中
      const variableExists = isVariableExists(binding.value)

      if (!variableExists) {
        // 如果变量不存在，返回未绑定状态
        return { isBound: false }
      }

      return {
        isBound: true,
        variableName: binding.value,
        source: binding.source,
        type: binding.type
      }
    }

    return { isBound: false }
  }, [node, isVariableExists])

  // 从节点数据初始化参数映射
  useEffect(() => {
    const nodeData = node.data as any
    const parameterMappings = nodeData?.parameter_mappings || {}
    const placeholders = nodeData?.placeholders || []

    // 将对象格式的参数映射转换为数组格式（用于界面显示）
    const initialMappings: ParameterMapping[] = placeholders.map((placeholder: string) => {
      const paramName = placeholder.replace(/[{}]/g, '') // 移除大括号
      const bindingStatus = getParameterBindingStatus(paramName)

      // 使用绑定状态检查的结果
      const value = bindingStatus.isBound ? bindingStatus.variableName : ''

      return {
        placeholder: paramName,
        value: value,
        source: bindingStatus.source || 'global_variable',
        type: bindingStatus.type || 'string'
      }
    })

    setMappings(initialMappings)
  }, [node, forceUpdate, getParameterBindingStatus]) // 当节点数据变化或强制更新时重新初始化

  // 监听全局变量更新事件
  useEffect(() => {
    const handleVariablesUpdate = (event: CustomEvent) => {
      // 强制重新渲染以更新变量选项
      setForceUpdate(prev => prev + 1)
    }

    // 监听自定义事件
    window.addEventListener('workflow-variables-updated', handleVariablesUpdate as EventListener)

    // 清理事件监听器
    return () => {
      window.removeEventListener('workflow-variables-updated', handleVariablesUpdate as EventListener)
    }
  }, [])

  // 获取节点的占位符
  const getNodePlaceholders = useMemo((): string[] => {
    return (node.data as any)?.placeholders || []
  }, [node])

  // 获取可用的源节点（排除当前节点）
  const getAvailableSourceNodes = useMemo((): SecurityNode[] => {
    return availableNodes.filter((n: SecurityNode) => n.id !== node.id)
  }, [availableNodes, node.id])

  // 获取所有可用的变量选项（分组格式）
  const getAllVariableOptions = useMemo(() => {
    const options: { nodeId: string; nodeName: string; variables: any[] }[] = []

    // 添加全局变量（从constants prop获取，而不是从开始节点）
    if (constants && constants.length > 0) {
      const globalVariables = constants.map((variable: WorkflowVariable) => ({
        name: variable.name,
        fullKey: variable.name, // 全局变量直接使用变量名
        displayName: variable.name // 全局变量显示名就是变量名
      }))

      options.push({
        nodeId: 'global',
        nodeName: '全局变量',
        variables: globalVariables
      })
    }

    // 添加其他节点的占位符变量
    getAvailableSourceNodes.forEach((sourceNode: SecurityNode) => {
      if (sourceNode.type !== 'workflow-start' && sourceNode.type !== 'workflow-end') {
        const nodeData = sourceNode.data as any
        const placeholders = nodeData?.placeholders || []
        
        if (placeholders.length > 0) {
          const nodeVariables = placeholders.map((placeholder: string) => ({
            name: placeholder,
            fullKey: `${sourceNode.id}.${placeholder}`,
            displayName: `${sourceNode.data?.title || sourceNode.type}.${placeholder}` // 使用节点标题.变量格式
          }))
          
          options.push({
            nodeId: sourceNode.id,
            nodeName: sourceNode.title || sourceNode.type || '未知节点',
            variables: nodeVariables
          })
        }
      }
    })

    return options
  }, [constants, availableNodes, node.id, getAvailableSourceNodes, forceUpdate])

  // 获取变量值预览
  const getVariableValuePreview = (value: string) => {
    // 如果是全局变量，从constants中查找值
    const globalVar = constants?.find(v => v.name === value)
    if (globalVar) {
      return `当前值: ${globalVar.value || '未设置'}`
    }

    // 如果是其他节点的输出，显示来源信息
    if (value.includes('.')) {
      const [nodeId, outputKey] = value.split('.')
      const sourceNode = availableNodes.find(n => n.id === nodeId)
      if (sourceNode) {
        return `来自节点: ${sourceNode.title}`
      }
    }

    return '数据来源已配置'
  }

  // 生成预览命令
  const generatePreviewCommand = () => {
    let preview = commandTemplate
    mappings.forEach((mapping) => {
      if (mapping.value) {
        // 在预览中使用友好的显示格式
        const displayValue = getDisplayValue(mapping.value)
        preview = preview.replace(`{${mapping.placeholder}}`, `{${displayValue}}`)
      }
    })
    return preview
  }





  // 推断变量类型
  const inferVariableType = (value: string): 'file_path' | 'number' | 'string' => {
    // 查找对应的全局变量
    const globalVariable = constants.find(c => c.name === value)
    if (globalVariable) {
      return globalVariable.type
    }

    // 如果是节点输出引用，默认为字符串类型
    if (value.includes('.')) {
      return 'string'
    }

    // 默认为字符串类型
    return 'string'
  }

  // 将 id.变量 格式转换为 标题.变量 格式用于显示
  const getDisplayValue = (value: string): string => {
    if (!value) return ''

    // 如果是全局变量（不包含点），直接返回
    if (!value.includes('.')) {
      return value
    }

    // 如果是节点输出引用（包含点），转换为友好格式
    const [nodeId, variableName] = value.split('.')

    // 查找对应的节点以获取标题
    const sourceNode = availableNodes.find(n => n.id === nodeId)
    const nodeTitle = sourceNode?.data?.title || nodeId

    return `${nodeTitle}.${variableName}`
  }

  // 更新映射配置
  const handleMappingChange = (index: number, value: string) => {
    const newMappings = [...mappings]

    newMappings[index] = {
      ...newMappings[index],
      value,
      type: inferVariableType(value)
    }
    setMappings(newMappings)
    onParameterChange?.(newMappings)
  }

  // 获取命令模板
  const commandTemplate = (node.data as any)?.command_template || ''

  // 如果没有占位符，显示提示信息
  if (getNodePlaceholders.length === 0) {
    return (
      <div className="space-y-4">
        {/* 标题区域 */}
        <div className="pb-3">
          <h3 className="text-sm font-medium flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            参数配置
          </h3>
          <p className="text-xs text-gray-500 mt-1">配置节点参数的数据源</p>
        </div>

        <div className="pb-3">
          <div className="text-center py-4 text-gray-500">
            <Settings className="h-6 w-6 mx-auto mb-2 text-gray-400" />
            <p className="text-xs">此节点无需参数配置</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 标题区域 */}
      <div className="pb-3">
        <h3 className="text-sm font-medium flex items-center">
          <Settings className="w-4 h-4 mr-2" />
          参数配置
        </h3>
        <p className="text-xs text-gray-500 mt-1">配置节点参数的数据源</p>
      </div>

      {/* 命令模板预览 */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-2 h-auto">
            <div className="flex items-center text-xs">
              <FileText className="w-3 h-3 mr-2" />
              命令预览
            </div>
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          <div className="bg-gray-50 border rounded p-3">
            <div className="text-xs text-gray-500 mb-2">原始命令:</div>
            <code className="text-xs text-gray-800 block mb-3 font-mono">
              {commandTemplate}
            </code>
            <div className="text-xs text-gray-500 mb-2">预览命令:</div>
            <code className="text-xs text-blue-600 block font-mono">
              {generatePreviewCommand()}
            </code>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* 参数映射配置 */}
      <div className="space-y-3">
        {mappings.map((mapping, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3 hover:border-gray-300 transition-colors">
            {/* 参数标题行 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Hash className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-900">{mapping.placeholder}</h4>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                变量
              </Badge>
            </div>

            {/* 变量选择 */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">数据来源</Label>
              <Select
                value={mapping.value || ''}
                onValueChange={(value) => handleMappingChange(index, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={
                    <div className="flex items-center text-gray-500">
                      <Settings className="w-4 h-4 mr-2" />
                      <span>选择数据来源...</span>
                    </div>
                  } />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {getAllVariableOptions.map((group: any) => (
                    <div key={group.nodeId}>
                      {/* 分组标题 */}
                      <div className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50 border-b">
                        <div className="flex items-center">
                          {group.nodeId === 'global' ? (
                            <Settings className="w-3 h-3 mr-2" />
                          ) : (
                            <Hash className="w-3 h-3 mr-2" />
                          )}
                          {group.nodeName}
                        </div>
                      </div>

                      {/* 变量选项 */}
                      {group.variables.map((variable: any) => (
                        <SelectItem key={variable.fullKey} value={variable.fullKey} className="py-2">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium">{variable.displayName || variable.name}</span>
                            </div>
                            {group.nodeId === 'global' && (
                              <Badge variant="secondary" className="text-xs ml-2">全局</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}

                  {/* 空状态 */}
                  {getAllVariableOptions.length === 0 && (
                    <div className="px-3 py-4 text-center text-gray-500">
                      <Settings className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-xs">暂无可用的变量</p>
                      <p className="text-xs text-gray-400 mt-1">请先在开始节点配置全局变量</p>
                    </div>
                  )}
                </SelectContent>
              </Select>

              {/* 当前绑定状态显示 */}
              {(() => {
                const bindingStatus = getParameterBindingStatus(mapping.placeholder)
                if (bindingStatus.isBound) {
                  return (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-800 font-medium">
                          已绑定: {getDisplayValue(bindingStatus.variableName)}
                        </span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        {getVariableValuePreview(bindingStatus.variableName)}
                      </p>
                    </div>
                  )
                }
                return null
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 