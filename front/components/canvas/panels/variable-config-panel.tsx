'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Plus,
  Trash2,
  Code,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Link2
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { WorkflowVariable, SecurityNode } from '../libs/types'
import { AddVariableDialog } from '../dialogs/add-variable-dialog'
import { getBindableParameters, getParameterBindingStatus, getVariableBindings } from '../utils'



interface ConstantsConfigProps {
  constants: WorkflowVariable[] // 变量列表
  onChange: (constants: WorkflowVariable[]) => void // 变量更新回调
  allNodes?: SecurityNode[] // 新增：所有工作流节点，用于变量绑定
  onNodeUpdate?: (nodeId: string, updates: any) => void // 新增：节点更新回调
}

export function ConstantsConfig({
  constants = [],
  onChange,
  allNodes = [],
  onNodeUpdate
}: ConstantsConfigProps) {
  const [localConstants, setLocalConstants] = useState<WorkflowVariable[]>(constants)
  const [validationErrors, setValidationErrors] = useState<Record<number, { name?: string; value?: string }>>({}) // 支持名称和值的验证错误
  const [forceUpdate, setForceUpdate] = useState(0) // 用于强制重新渲染

  // 弹框状态
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // 分组折叠状态
  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>({
    file_path: false,
    number: false,
    string: false
  })







  useEffect(() => {
    // 迁移旧的变量数据，为没有type字段的变量添加默认type
    const migratedConstants = constants.map(constant => ({
      ...constant,
      type: constant.type || 'string' as 'file_path' | 'number' | 'string'
    }))
    setLocalConstants(migratedConstants)
    // 重置验证错误当constants变化时
    setValidationErrors({})

    // 如果有迁移的数据，通知父组件
    if (migratedConstants.some((c, i) => c.type !== constants[i]?.type)) {
      onChange(migratedConstants)
    }
  }, [constants, onChange])

  // 监听全局变量更新事件（用于更新绑定状态显示）
  useEffect(() => {
    const handleVariablesUpdate = (event: CustomEvent) => {
      // 强制重新渲染以更新绑定状态显示
      setForceUpdate(prev => prev + 1)
    }

    // 监听自定义事件
    window.addEventListener('workflow-variables-updated', handleVariablesUpdate as EventListener)

    // 清理事件监听器
    return () => {
      window.removeEventListener('workflow-variables-updated', handleVariablesUpdate as EventListener)
    }
  }, [])

  // 验证变量名称 - 使用 useCallback 优化
  const validateVariableName = useCallback((name: string, index: number): string | null => {
    // 检查是否为空
    if (!name.trim()) {
      return '变量名不能为空'
    }

    // 检查是否包含特殊字符（只允许字母、数字、下划线）
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name.trim())) {
      return '变量名只能包含字母、数字和下划线，且不能以数字开头'
    }

    // 检查是否重复（不区分大小写，排除当前正在编辑的变量）
    const duplicateIndex = localConstants.findIndex((constant, i) =>
      i !== index && constant.name.toLowerCase() === name.trim().toLowerCase()
    )

    if (duplicateIndex !== -1) {
      return '变量名已存在，请使用不同的名称'
    }

    return null
  }, [localConstants])

  // 验证变量值 - 使用 useCallback 优化
  const validateVariableValue = useCallback((value: string, index: number): string | null => {
    if (!value.trim()) {
      return '变量值不能为空'
    }

    // 检查变量值是否重复（排除当前正在编辑的变量）
    const duplicateIndex = localConstants.findIndex((constant, i) =>
      i !== index && constant.value.trim() === value.trim()
    )

    if (duplicateIndex !== -1) {
      return `变量值重复，与变量 "${localConstants[duplicateIndex].name}" 的值相同`
    }

    return null
  }, [localConstants])

  // 验证变量名 - 使用 useCallback 优化
  const validateVariableName_Field = useCallback((index: number, name: string) => {
    const error = validateVariableName(name, index)
    setValidationErrors(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        name: error || undefined
      }
    }))
    return !error
  }, [validateVariableName])

  // 验证变量值 - 使用 useCallback 优化
  const validateVariableValue_Field = useCallback((index: number, value: string) => {
    const error = validateVariableValue(value, index)
    setValidationErrors(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        value: error || undefined
      }
    }))
  }, [validateVariableValue])

  // 检查是否有任何验证错误 - 使用 useMemo 优化
  const hasValidationErrors = useMemo(() => {
    return Object.values(validationErrors).some(errors =>
      errors && (errors.name || errors.value)
    )
  }, [validationErrors])

  // 处理新增变量确认 - 使用 useCallback 优化
  const handleConfirmAdd = useCallback((variable: WorkflowVariable, selectedBindings: { [nodeId: string]: string[] }) => {
    // 检查变量名是否重复
    const nameError = validateVariableName(variable.name, -1)
    if (nameError) {
      return
    }

    // 检查变量值是否重复
    const valueError = validateVariableValue(variable.value, -1)
    if (valueError) {
      return
    }

    const newConstants = [...localConstants, variable]
    setLocalConstants(newConstants)
    onChange(newConstants)

    // 处理变量绑定
    if (Object.keys(selectedBindings).length > 0 && onNodeUpdate) {
      Object.entries(selectedBindings).forEach(([nodeId, parameters]) => {
        if (parameters.length > 0) {
          // 获取节点当前的参数映射
          const node = allNodes.find(n => n.id === nodeId)
          if (node) {
            const currentMappings = (node.data as any)?.parameter_mappings || {}

            // 为选中的参数绑定新变量
            parameters.forEach(paramName => {
              currentMappings[paramName] = {
                source: 'global_variable',
                value: variable.name,
                type: variable.type
              }
            })

            // 更新节点
            onNodeUpdate(nodeId, {
              parameter_mappings: currentMappings
            })
          }
        }
      })
    }

    // 发送全局变量更新事件，通知其他页面刷新
    window.dispatchEvent(new CustomEvent('workflow-variables-updated', {
      detail: {
        action: 'create',
        variableName: variable.name,
        variables: newConstants
      }
    }))

    // 关闭弹框
    setIsDialogOpen(false)
  }, [validateVariableName, validateVariableValue, localConstants, onChange, allNodes, onNodeUpdate])

  // 优化分组计算 - 使用 useMemo 避免每次渲染都重新计算
  const variablesByType = useMemo(() => {
    const groups = {
      file_path: localConstants.filter(v => v.type === 'file_path'),
      number: localConstants.filter(v => v.type === 'number'),
      string: localConstants.filter(v => v.type === 'string')
    }
    return groups
  }, [localConstants])

  // 优化绑定参数计算 - 使用 useMemo 避免每次渲染都重新计算
  const bindableParameters = useMemo(() =>
    getBindableParameters(allNodes), [allNodes]
  )

  // 优化变量绑定计算 - 使用 useMemo 避免每次渲染都重新计算
  const variableBindings = useMemo(() => {
    const bindings: { [variableName: string]: any[] } = {}
    localConstants.forEach(variable => {
      bindings[variable.name] = getVariableBindings(variable.name, allNodes)
    })
    return bindings
  }, [localConstants, allNodes])

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'file_path': return '📁'
      case 'number': return '🔢'
      case 'string': return '📝'
      default: return '📝'
    }
  }

  // 获取类型名称
  const getTypeName = (type: string) => {
    switch (type) {
      case 'file_path': return '文件路径变量'
      case 'number': return '数字变量'
      case 'string': return '字符串变量'
      default: return '字符串变量'
    }
  }

  // 切换分组折叠状态
  const toggleGroupCollapse = useCallback((type: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }, [])

  const handleUpdateConstant = useCallback((index: number, field: 'name' | 'value' | 'type', value: string) => {
    const oldVariable = localConstants[index]
    const newConstants = [...localConstants]
    newConstants[index] = { ...newConstants[index], [field]: value }
    setLocalConstants(newConstants)

    // 如果是更新名称，进行验证
    if (field === 'name') {
      const isValid = validateVariableName(value, index)
      // 只有验证通过且没有其他错误时才调用onChange
      if (isValid && !hasValidationErrors) {
        onChange(newConstants)

        // 发送全局变量更新事件
        window.dispatchEvent(new CustomEvent('workflow-variables-updated', {
          detail: {
            action: 'update',
            variableName: value,
            oldVariableName: oldVariable.name,
            variables: newConstants
          }
        }))
      }
    } else {
      // 更新值或类型时，检查当前名称是否有效
      const nameError = validateVariableName(newConstants[index].name, index)
      if (!nameError && !hasValidationErrors) {
        onChange(newConstants)

        // 发送全局变量更新事件
        window.dispatchEvent(new CustomEvent('workflow-variables-updated', {
          detail: {
            action: 'update',
            variableName: newConstants[index].name,
            variables: newConstants
          }
        }))
      }
    }
  }, [validateVariableName, hasValidationErrors, localConstants, onChange])

  const handleDeleteConstant = useCallback((index: number) => {
    const deletedVariable = localConstants[index]
    const newConstants = localConstants.filter((_, i) => i !== index)
    setLocalConstants(newConstants)

    // 清除对应的验证错误
    const newErrors = { ...validationErrors }
    delete newErrors[index]
    // 重新索引错误（因为删除了一个元素，后面的索引都要减1）
    const reindexedErrors: Record<number, { name?: string; value?: string }> = {}
    Object.entries(newErrors).forEach(([key, value]) => {
      const numKey = parseInt(key)
      if (numKey > index) {
        reindexedErrors[numKey - 1] = value
      } else if (numKey < index) {
        reindexedErrors[numKey] = value
      }
    })
    setValidationErrors(reindexedErrors)

    // 清理所有节点中对已删除变量的绑定
    if (onNodeUpdate && deletedVariable.name) {
      allNodes.forEach(node => {
        const parameterMappings = (node.data as any)?.parameter_mappings || {}
        let hasChanges = false
        const updatedMappings = { ...parameterMappings }

        // 检查每个参数映射，如果绑定的是被删除的变量，则清除绑定
        Object.keys(updatedMappings).forEach(paramName => {
          if (updatedMappings[paramName]?.value === deletedVariable.name) {
            delete updatedMappings[paramName]
            hasChanges = true
          }
        })

        // 如果有变化，更新节点
        if (hasChanges) {
          onNodeUpdate(node.id, {
            parameter_mappings: updatedMappings
          })
        }
      })
    }

    // 通知父组件变量已更新
    onChange(newConstants)

    // 发送全局变量更新事件，通知其他页面刷新
    window.dispatchEvent(new CustomEvent('workflow-variables-updated', {
      detail: {
        action: 'delete',
        variableName: deletedVariable.name,
        variables: newConstants
      }
    }))
  }, [localConstants, validationErrors, onNodeUpdate, allNodes, onChange])

  return (
    <div className="space-y-4">
      {/* 标题区域 */}
      <div className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center">
            <Code className="w-4 h-4 mr-2" />
            全局变量定义
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsDialogOpen(true)}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            新增变量
          </Button>

          <AddVariableDialog
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            onConfirm={handleConfirmAdd}
            allNodes={allNodes}
            variableTemplates={[]}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">定义工作流中可使用的全局变量</p>
      </div>

      <div className="space-y-3">
        {localConstants.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Code className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">暂无全局变量</p>
            <p className="text-xs text-gray-400">点击上方按钮添加变量</p>
          </div>
        ) : (
          <>
            {/* 验证状态提示 */}
            {hasValidationErrors && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                <p className="text-xs text-red-600 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  存在验证错误，请修正后保存
                </p>
              </div>
            )}

            {/* 变量列表 - 分组显示 */}
            <div className="space-y-4">
              {Object.entries(variablesByType).map(([type, variables]) => (
                <div key={type} className="border border-gray-200 rounded-lg">
                  {/* 分组标题 */}
                  <div
                    className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 rounded-t-lg"
                    onClick={() => toggleGroupCollapse(type)}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{getTypeIcon(type)}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {getTypeName(type)} ({variables.length}个)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {collapsedGroups[type] ? (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* 变量列表 */}
                  {!collapsedGroups[type] && (
                    <div>
                      {variables.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          暂无{getTypeName(type)}
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {/* 变量行 */}
                          {variables.map((constant, groupIndex) => {
                          const globalIndex = localConstants.findIndex(c => c === constant)
                          const bindings = getVariableBindings(constant.name, allNodes)
                          return (
                            <div key={globalIndex} className="p-3 hover:bg-gray-50">
                              {/* 主要信息行 */}
                              <div className="grid grid-cols-12 gap-3 items-center">
                                {/* 变量名 - 6列 (增加宽度) */}
                                <div className="col-span-6">
                                  <div className="relative">
                                    <Input
                                      value={constant.name}
                                      onChange={(e) => handleUpdateConstant(globalIndex, 'name', e.target.value)}
                                      onBlur={(e) => validateVariableName_Field(globalIndex, e.target.value)}
                                      placeholder="变量名"
                                      title={constant.name} // 悬停显示完整名称
                                      className={`h-8 text-xs ${
                                        validationErrors[globalIndex]?.name ? 'border-red-500 focus:border-red-500' : ''
                                      }`}
                                      style={{
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden'
                                      }}
                                    />
                                    {validationErrors[globalIndex]?.name && (
                                      <p className="mt-1 text-xs text-red-500">{validationErrors[globalIndex].name}</p>
                                    )}
                                  </div>
                                </div>

                                {/* 变量值 - 5列 */}
                                <div className="col-span-5">
                                  <Input
                                    value={constant.value}
                                    onChange={(e) => handleUpdateConstant(globalIndex, 'value', e.target.value)}
                                    onBlur={(e) => validateVariableValue_Field(globalIndex, e.target.value)}
                                    placeholder="变量值"
                                    title={constant.value} // 悬停显示完整值
                                    className={`h-8 text-xs ${
                                      validationErrors[globalIndex]?.value ? 'border-red-500 focus:border-red-500' : ''
                                    }`}
                                    style={{
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden'
                                    }}
                                  />
                                  {validationErrors[globalIndex]?.value && (
                                    <p className="mt-1 text-xs text-red-500">{validationErrors[globalIndex].value}</p>
                                  )}
                                </div>

                                {/* 删除按钮 - 1列 */}
                                <div className="col-span-1 flex justify-center">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDeleteConstant(globalIndex)}
                                    className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                                    title="删除变量"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* 绑定信息显示 */}
                              {bindings.length > 0 && (
                                <div className="mt-2 pl-2 border-l-2 border-green-200">
                                  <div className="flex items-center space-x-1 mb-1">
                                    <Link2 className="w-3 h-3 text-green-600" />
                                    <span className="text-xs text-green-700 font-medium">
                                      已绑定到 {bindings.length} 个参数:
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    {bindings.map((binding, bindingIndex) => (
                                      <div key={bindingIndex} className="flex items-center space-x-2 text-xs text-gray-600">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                        <span className="font-medium">{binding.nodeName}</span>
                                        <span className="text-gray-400">→</span>
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                          {binding.paramName}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 使用方式提示 - 简化版 */}
            {localConstants.some((c, i) => c.name && !validationErrors[i]?.name && !validationErrors[i]?.value) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-700 mb-2">💡 使用方式</div>
                <p className="text-xs text-blue-600 mb-2">
                  在节点配置中使用 <code className="bg-blue-200 px-1 rounded">{`{变量名}`}</code> 格式引用这些变量：
                </p>

                <div className="flex flex-wrap gap-2">
                  {localConstants
                    .filter((c, i) => c.name && !validationErrors[i]?.name && !validationErrors[i]?.value)
                    .map((constant, index) => (
                      <code key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                        {`{${constant.name}}`}
                      </code>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
} 