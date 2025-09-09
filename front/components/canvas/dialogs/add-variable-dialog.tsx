'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  FileText,
  Link,
  AlertCircle,
  ChevronDown,
  Settings,
  Check
} from 'lucide-react'
import type { WorkflowVariable, SecurityNode } from '../libs/types'
import { getBindableParameters, getParameterBindingStatus } from '../utils'

// 变量模板接口定义
interface VariableTemplate {
  name: string
  value: string
  type: 'file_path' | 'number' | 'string'
  description: string
  category: string
}

interface AddVariableDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (variable: WorkflowVariable, selectedBindings: { [nodeId: string]: string[] }) => void
  allNodes: SecurityNode[]
  variableTemplates: VariableTemplate[]
}

// 变量模板数据
const VARIABLE_TEMPLATES: VariableTemplate[] = [
  // 文件路径类型
  { name: 'target_domains_file', value: '/tmp/domains.txt', type: 'file_path', description: '目标域名文件', category: '文件路径' },
  { name: 'target_ips_file', value: '/tmp/ips.txt', type: 'file_path', description: '目标IP文件', category: '文件路径' },
  { name: 'wordlist_file', value: '/usr/share/wordlists/common.txt', type: 'file_path', description: '字典文件', category: '文件路径' },
  { name: 'output_file', value: '/tmp/scan_results.txt', type: 'file_path', description: '输出结果文件', category: '文件路径' },
  { name: 'config_file', value: '/etc/tool/config.conf', type: 'file_path', description: '配置文件', category: '文件路径' },

  // 数字类型
  { name: 'port', value: '80', type: 'number', description: 'HTTP端口', category: '端口号' },
  { name: 'https_port', value: '443', type: 'number', description: 'HTTPS端口', category: '端口号' },
  { name: 'ssh_port', value: '22', type: 'number', description: 'SSH端口', category: '端口号' },
  { name: 'mysql_port', value: '3306', type: 'number', description: 'MySQL端口', category: '端口号' },
  { name: 'redis_port', value: '6379', type: 'number', description: 'Redis端口', category: '端口号' },
  { name: 'timeout', value: '30', type: 'number', description: '超时时间(秒)', category: '数值参数' },
  { name: 'threads', value: '10', type: 'number', description: '线程数', category: '数值参数' },
  { name: 'max_depth', value: '3', type: 'number', description: '最大深度', category: '数值参数' },

  // 字符串类型
  { name: 'target_domain', value: 'example.com', type: 'string', description: '目标域名', category: '目标信息' },
  { name: 'target_ip', value: '192.168.1.1', type: 'string', description: '目标IP地址', category: '目标信息' },
  { name: 'target_url', value: 'https://example.com', type: 'string', description: '目标URL', category: '目标信息' },
  { name: 'user_agent', value: 'Mozilla/5.0 (compatible; Scanner/1.0)', type: 'string', description: '用户代理', category: '请求参数' },
  { name: 'api_key', value: 'your-api-key-here', type: 'string', description: 'API密钥', category: '认证信息' },
  { name: 'username', value: 'admin', type: 'string', description: '用户名', category: '认证信息' },
  { name: 'password', value: 'password123', type: 'string', description: '密码', category: '认证信息' },
  { name: 'scan_type', value: 'full', type: 'string', description: '扫描类型', category: '扫描参数' },
  { name: 'output_format', value: 'json', type: 'string', description: '输出格式', category: '输出参数' },
]

export function AddVariableDialog({
  isOpen,
  onClose,
  onConfirm,
  allNodes,
  variableTemplates
}: AddVariableDialogProps) {
  const [newVariable, setNewVariable] = useState<WorkflowVariable>({
    name: '',
    value: '',
    type: 'string'
  })

  const [showBindingOptions, setShowBindingOptions] = useState(false)
  const [selectedBindings, setSelectedBindings] = useState<{ [nodeId: string]: string[] }>({})





  // 从模板添加变量到弹框
  const handleAddFromTemplate = (template: VariableTemplate) => {
    setNewVariable({
      name: template.name,
      value: template.value,
      type: template.type,
    })
  }

  // 处理参数绑定选择
  const handleParameterBindingChange = (nodeId: string, paramName: string, checked: boolean) => {
    setSelectedBindings(prev => {
      const nodeBindings = prev[nodeId] || []

      if (checked) {
        if (!nodeBindings.includes(paramName)) {
          return {
            ...prev,
            [nodeId]: [...nodeBindings, paramName]
          }
        }
      } else {
        const updatedBindings = nodeBindings.filter(p => p !== paramName)
        if (updatedBindings.length === 0) {
          const { [nodeId]: removed, ...rest } = prev
          return rest
        } else {
          return {
            ...prev,
            [nodeId]: updatedBindings
          }
        }
      }

      return prev
    })
  }

  // 确认添加变量
  const handleConfirm = () => {
    if (!newVariable.name.trim() || !newVariable.value.trim()) {
      return
    }

    onConfirm(newVariable, selectedBindings)

    // 重置状态
    setNewVariable({
      name: '',
      value: '',
      type: 'string'
    })
    setShowBindingOptions(false)
    setSelectedBindings({})
  }

  // 取消添加
  const handleCancel = () => {
    setNewVariable({
      name: '',
      value: '',
      type: 'string'
    })
    setShowBindingOptions(false)
    setSelectedBindings({})
    onClose()
  }

  // 按分类分组模板
  const getTemplatesByCategory = () => {
    const categories: { [key: string]: VariableTemplate[] } = {}
    VARIABLE_TEMPLATES.forEach(template => {
      if (!categories[template.category]) {
        categories[template.category] = []
      }
      categories[template.category].push(template)
    })
    return categories
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">新增全局变量</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 模板选择 - 紧凑版 */}
          <div>
            <Label className="text-sm font-medium mb-1 block">快速选择模板</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between text-xs h-8">
                  <span className="flex items-center">
                    <FileText className="w-3 h-3 mr-2" />
                    选择变量模板
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 max-h-[50vh] overflow-y-auto">
                <DropdownMenuLabel className="text-xs">选择变量模板</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(getTemplatesByCategory()).map(([category, templates]) => (
                  <div key={category}>
                    <DropdownMenuLabel className="text-xs text-gray-500 px-2 py-1">
                      {category}
                    </DropdownMenuLabel>
                    {templates.map((template) => (
                      <DropdownMenuItem
                        key={template.name}
                        onClick={() => handleAddFromTemplate(template)}
                        className="text-xs cursor-pointer py-2"
                      >
                        <div className="flex flex-col items-start w-full space-y-1">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-mono text-blue-600 text-xs font-medium">{template.name}</span>
                            <span className="text-xs text-gray-400 ml-2">
                              {template.type === 'file_path' ? '文件' : template.type === 'number' ? '数字' : '字符'}
                            </span>
                          </div>
                          <span className="text-gray-500 text-xs">{template.description}</span>
                          <span className="font-mono text-xs text-gray-600 bg-gray-100 px-1 rounded truncate w-full">
                            {template.value}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 变量配置 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium mb-1 block">变量名</Label>
              <Input
                value={newVariable.name}
                onChange={(e) => setNewVariable(prev => ({ ...prev, name: e.target.value }))}
                placeholder="输入变量名"
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">变量类型</Label>
              <Select
                value={newVariable.type}
                onValueChange={(value) => setNewVariable(prev => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">字符串</SelectItem>
                  <SelectItem value="number">数字</SelectItem>
                  <SelectItem value="file_path">文件路径</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1 block">变量值</Label>
            <Input
              value={newVariable.value}
              onChange={(e) => setNewVariable(prev => ({ ...prev, value: e.target.value }))}
              placeholder="输入变量值"
              className="text-xs"
            />
          </div>

          {/* 变量绑定选项 */}
          {getBindableParameters(allNodes).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-binding"
                  checked={showBindingOptions}
                  onCheckedChange={(checked) => {
                    setShowBindingOptions(checked as boolean)
                    if (!checked) {
                      setSelectedBindings({})
                    }
                  }}
                />
                <Label htmlFor="show-binding" className="text-sm font-medium flex items-center">
                  <Link className="w-4 h-4 mr-2" />
                  同时绑定到节点参数
                </Label>
              </div>

              {showBindingOptions && (
                <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600">
                      选择要绑定此变量的节点参数，创建变量后会自动配置参数映射。
                    </p>
                    <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                      💡 提示：一个变量可以同时绑定到多个节点的多个参数。已绑定的参数会显示绿色背景。
                    </p>

                    {/* 已绑定参数统计提示 */}
                    {(() => {
                      const allParams = getBindableParameters(allNodes)
                      const boundParamsCount = allParams.reduce((count, { nodeId, parameters }) => {
                        const node = allNodes.find(n => n.id === nodeId)
                        return count + parameters.filter(paramName =>
                          node ? getParameterBindingStatus(node, paramName, newVariable.name ? [] : undefined)?.isBound : false
                        ).length
                      }, 0)

                      if (boundParamsCount > 0) {
                        return (
                          <div className="flex items-center space-x-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>
                              当前有 {boundParamsCount} 个参数已绑定到其他变量，重新绑定将覆盖原有配置
                            </span>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>

                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {getBindableParameters(allNodes).map(({ nodeId, nodeName, parameters }) => (
                      <div key={nodeId} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Settings className="w-3 h-3 text-gray-500" />
                          <span className="text-xs font-medium text-gray-700">{nodeName}</span>
                        </div>

                        <div className="ml-5 space-y-1">
                          {parameters.map(paramName => {
                            const node = allNodes.find(n => n.id === nodeId)
                            const bindingStatus = node ? getParameterBindingStatus(node, paramName, undefined) : { isBound: false }
                            const isCurrentlyBound = bindingStatus?.isBound || false

                            return (
                              <div
                                key={paramName}
                                className={`flex items-center justify-between space-x-2 p-2 rounded-md transition-colors ${
                                  isCurrentlyBound
                                    ? 'bg-green-50 border border-green-200'
                                    : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${nodeId}-${paramName}`}
                                    checked={selectedBindings[nodeId]?.includes(paramName) || false}
                                    onCheckedChange={(checked) =>
                                      handleParameterBindingChange(nodeId, paramName, checked as boolean)
                                    }
                                  />
                                  <Label
                                    htmlFor={`${nodeId}-${paramName}`}
                                    className={`text-xs font-mono ${
                                      isCurrentlyBound
                                        ? 'text-green-700 font-medium'
                                        : 'text-gray-600'
                                    }`}
                                  >
                                    {`{${paramName}}`}
                                  </Label>
                                </div>

                                {/* 已绑定状态提示 */}
                                {isCurrentlyBound && (
                                  <div className="flex items-center space-x-1">
                                    <Link className="w-3 h-3 text-green-600" />
                                    <span className="text-xs text-green-600 font-medium">
                                      已绑定: {bindingStatus?.variableName}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {Object.keys(selectedBindings).length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <div className="flex items-center space-x-1 mb-1">
                        <Check className="w-3 h-3 text-blue-600" />
                        <span className="text-xs font-medium text-blue-800">
                          将绑定 {Object.values(selectedBindings).flat().length} 个参数
                        </span>
                      </div>
                      <p className="text-xs text-blue-600">
                        创建变量后，选中的参数将自动配置为使用此变量
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} className="text-xs">
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!newVariable.name.trim()}
            className="text-xs"
          >
            确认添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
