'use client'

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Loader2, Edit3, Link } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  type SecurityNode,
  InputVarType,
} from '@/components/canvas/libs/types'
import type { WorkflowComponent } from '../hooks/use-workflow-components'
import { useWorkflowComponents } from '../hooks/use-workflow-components'

// 参数输入方式
export type ParameterInputType = 'manual' | 'previous_node'

// 参数配置项
export interface ParameterConfig {
  id: string
  placeholder: string
  value?: string
  hint?: string
  inputType: ParameterInputType
}

// 组件属性
export interface NodeParameterConfigProps {
  node: SecurityNode | null
  onParameterChange?: (parameters: ParameterConfig[]) => void
  className?: string
}

export function NodeParameterConfig({ 
  node, 
  onParameterChange, 
  className 
}: NodeParameterConfigProps) {
  // 使用现有的组件数据Context
  const { components, isLoading, error } = useWorkflowComponents()
  const [parameters, setParameters] = useState<ParameterConfig[]>([])

  // 根据节点和组件数据生成参数配置
  const generateParametersForNode = (nodeTitle: string, componentsData: WorkflowComponent[]) => {
    const component = componentsData.find(comp => comp.name === nodeTitle)

    if (!component) {
      setParameters([])
      return
    }

    const params: ParameterConfig[] = component.placeholders.map((placeholder: string, index: number) => ({
      id: `${index + 1}`,
      placeholder: placeholder,
      value: '',
      hint: getParameterHint(placeholder),
      inputType: 'manual'
    }))

    setParameters(params)
    onParameterChange?.(params)
  }

  // 获取参数提示
  const getParameterHint = (placeholder: string): string => {
    return `请输入 ${placeholder} 的值`
  }



  // 节点变化时重新生成参数
  useEffect(() => {
    if (node && components.length > 0) {
      generateParametersForNode(node.title, components)
    }
  }, [node, components])

  // 生成命令预览
  const generateCommandPreview = (): string => {
    if (!node || components.length === 0) {
      return 'Loading...'
    }

    const component = components.find(comp => comp.name === node.title)
    if (!component) {
      return 'Unknown command'
    }

    // 使用 commandTemplate
    let template = component.commandTemplate || ''

    parameters.forEach(param => {
      if (param.value && template) {
        template = template.replace(param.placeholder, param.value.toString())
      }
    })
    
    return template
  }

  // 更新参数配置
  const updateParameter = (id: string, updates: Partial<ParameterConfig>) => {
    const newParameters = parameters.map(param => 
      param.id === id ? { ...param, ...updates } : param
    )
    setParameters(newParameters)
    onParameterChange?.(newParameters)
  }

  if (!node) {
    return null
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">加载参数配置...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-center py-16 text-red-500">
          <span>加载组件数据失败: {error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 命令预览 */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-gray-800">命令预览</h4>
        </div>
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-200 shadow-sm">
          <div className="text-green-400 font-mono text-sm break-all">
            $ {generateCommandPreview()}
          </div>
        </div>
        <p className="text-xs text-gray-500 italic">
          💡 根据下方参数配置实时生成的执行命令
        </p>
      </div>

      {/* 参数配置 */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <h4 className="text-sm font-semibold text-gray-800">参数配置</h4>
        </div>

        {parameters.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <Settings className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-medium">该节点暂无可配置参数</p>
            <p className="text-xs text-gray-400 mt-1">节点将使用默认配置运行</p>
          </div>
        ) : (
          <div className="space-y-2">
            {parameters.map((param, index) => (
              <div key={param.id} className="bg-white rounded-md border border-gray-200 p-2 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
                      {index + 1}
                    </span>
                    <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {param.placeholder}
                    </span>
                  </div>
                  <Select
                    value={param.inputType}
                    onValueChange={(value: ParameterInputType) =>
                      updateParameter(param.id, {
                        inputType: value,
                        value: value === 'previous_node' ? '上个节点输出' : ''
                      })
                    }
                  >
                    <SelectTrigger className="w-28 h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">
                        <div className="flex items-center space-x-1">
                          <Edit3 className="w-3 h-3" />
                          <span>手动输入</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="previous_node">
                        <div className="flex items-center space-x-1">
                          <Link className="w-3 h-3" />
                          <span>上个节点</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Input
                    type="text"
                    value={param.value || ''}
                    onChange={(e) => updateParameter(param.id, { value: e.target.value })}
                    placeholder={param.inputType === 'manual' ? param.hint : '将使用上个节点的输出结果'}
                    disabled={param.inputType === 'previous_node'}
                    className="text-xs h-7 border-gray-300 focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
