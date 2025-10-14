"use client"

import React, { useState, useEffect } from "react"
import { Edit, Link, AlertCircle, CheckCircle2, Globe, Save } from "lucide-react"

// 导入 UI 组件
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// 导入 React Query Hook
import { useUpdateEndpoint } from "@/hooks/use-endpoints"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// 导入类型定义
import type { Endpoint, UpdateEndpointRequest } from "@/types/endpoint.types"

// 组件属性类型定义
interface EditEndpointDialogProps {
  endpoint: Endpoint                           // 要编辑的 Endpoint 数据
  onEdit: (endpoint: Endpoint) => void        // 编辑成功回调函数
  open?: boolean                               // 外部控制对话框开关状态
  onOpenChange?: (open: boolean) => void       // 外部控制对话框开关回调
  trigger?: React.ReactNode                    // 自定义触发器
}

// HTTP 方法选项
const HTTP_METHODS = [
  'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'
]

// 常见状态码选项
const STATUS_CODES = [
  { value: 200, label: '200 - OK', category: 'success' },
  { value: 201, label: '201 - Created', category: 'success' },
  { value: 204, label: '204 - No Content', category: 'success' },
  { value: 301, label: '301 - Moved Permanently', category: 'redirect' },
  { value: 302, label: '302 - Found', category: 'redirect' },
  { value: 400, label: '400 - Bad Request', category: 'client_error' },
  { value: 401, label: '401 - Unauthorized', category: 'client_error' },
  { value: 403, label: '403 - Forbidden', category: 'client_error' },
  { value: 404, label: '404 - Not Found', category: 'client_error' },
  { value: 500, label: '500 - Internal Server Error', category: 'server_error' },
  { value: 502, label: '502 - Bad Gateway', category: 'server_error' },
  { value: 503, label: '503 - Service Unavailable', category: 'server_error' },
]

// 状态码颜色映射
const getStatusCodeColor = (code: number) => {
  if (code >= 200 && code < 300) return 'bg-green-100 text-green-800'
  if (code >= 300 && code < 400) return 'bg-blue-100 text-blue-800'
  if (code >= 400 && code < 500) return 'bg-yellow-100 text-yellow-800'
  if (code >= 500) return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}

/**
 * 编辑 Endpoint 对话框组件
 * 提供编辑现有 Endpoint 的表单界面
 * 
 * 功能特性：
 * 1. 预填充现有数据
 * 2. 表单验证
 * 3. 变更检测
 * 4. 错误处理
 * 5. 加载状态
 * 6. 用户友好的交互
 */
export function EditEndpointDialog({ 
  endpoint,
  onEdit, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange,
  trigger
}: EditEndpointDialogProps) {
  // 对话框开关状态 - 支持外部控制
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  // 表单状态 - 使用原始数据初始化
  const [url, setUrl] = useState(endpoint.url)
  const [method, setMethod] = useState(endpoint.method)
  const [statusCode, setStatusCode] = useState(endpoint.statusCode)
  const [title, setTitle] = useState(endpoint.title)
  const [contentLength, setContentLength] = useState(endpoint.contentLength)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // 使用 React Query 的更新 Endpoint mutation
  const updateEndpoint = useUpdateEndpoint()

  // 验证 URL 格式 - 只支持完整 URL
  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url)
      return ['http:', 'https:'].includes(urlObj.protocol)
    } catch {
      return false
    }
  }

  // 检测表单变更
  useEffect(() => {
    const hasFormChanges = 
      url !== endpoint.url ||
      method !== endpoint.method ||
      statusCode !== endpoint.statusCode ||
      title !== endpoint.title ||
      contentLength !== endpoint.contentLength
    
    setHasChanges(hasFormChanges)
  }, [url, method, statusCode, title, contentLength, endpoint])

  // 实时验证
  useEffect(() => {
    const errors: string[] = []
    
    if (!url?.trim()) {
      errors.push('URL 不能为空')
    } else if (!validateUrl(url)) {
      errors.push('URL 格式无效（需要完整 URL）')
    }
    
    if (!title?.trim()) {
      errors.push('标题不能为空')
    }
    
    setValidationErrors(errors)
  }, [url, title])

  // 重置表单到原始状态
  const resetForm = () => {
    setUrl(endpoint.url)
    setMethod(endpoint.method)
    setStatusCode(endpoint.statusCode)
    setTitle(endpoint.title)
    setContentLength(endpoint.contentLength)
    setValidationErrors([])
    setHasChanges(false)
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 如果有验证错误或没有变更，不允许提交
    if (validationErrors.length > 0 || !hasChanges) {
      return
    }

    // 构建更新数据
    const updateData: UpdateEndpointRequest = {
      id: endpoint.id,
      url: url?.trim() || "",
      method,
      statusCode,
      title: title?.trim() || "",
      contentLength,
      domain: "",
      subdomain: undefined,
    }

    // 使用 React Query mutation
    updateEndpoint.mutate(updateData, {
      onSuccess: (response) => {
        if (response.state === "success" && response.data) {
          // 调用成功回调
          onEdit(response.data)
          
          // 关闭对话框
          setOpen(false)
        }
      }
    })
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!updateEndpoint.isPending) {
      setOpen(newOpen)
      if (!newOpen) {
        // 关闭时重置表单
        resetForm()
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* 触发按钮 - 仅在非外部控制时显示 */}
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="sm">
              <Edit />
            </Button>
          )}
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit />
            <span>编辑 Endpoint</span>
            {hasChanges && (
              <Badge variant="secondary" className="text-xs">
                <AlertCircle />
                有未保存的更改
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            修改 Endpoint 的详细信息。需要输入完整 URL（如 https://example.com/api/v1/users）。
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* URL 输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="url">
                URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/api/v1/users"
                disabled={updateEndpoint.isPending}
                className={`font-mono ${validationErrors.some(e => e.includes('URL')) ? 'border-destructive' : ''}`}
              />
            </div>

            {/* 第一行：HTTP 方法和状态码 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="method">HTTP 方法</Label>
                <Select value={method} onValueChange={setMethod} disabled={updateEndpoint.isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择 HTTP 方法" />
                  </SelectTrigger>
                  <SelectContent>
                    {HTTP_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        <Badge variant="outline" >{m}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="statusCode">状态码</Label>
                <Select 
                  value={statusCode.toString()} 
                  onValueChange={(value) => setStatusCode(parseInt(value))}
                  disabled={updateEndpoint.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态码" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_CODES.map((status) => (
                      <SelectItem key={status.value} value={status.value.toString()}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 第二行：标题 */}
            <div className="grid gap-2">
              <Label htmlFor="title">
                标题 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Endpoint 标题"
                disabled={updateEndpoint.isPending}
                className={validationErrors.some(e => e.includes('标题')) ? 'border-destructive' : ''}
              />
            </div>

            {/* 第三行：内容长度 */}
            <div className="grid gap-2">
              <Label htmlFor="contentLength">内容长度 (字节)</Label>
              <Input
                id="contentLength"
                type="number"
                value={contentLength}
                onChange={(e) => setContentLength(parseInt(e.target.value) || 0)}
                placeholder="0"
                disabled={updateEndpoint.isPending}
                min="0"
              />
            </div>

            {/* 验证错误提示 */}
            {validationErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="text-destructive" />
                  <span className="text-sm font-medium text-destructive">请修复以下问题</span>
                </div>
                <ul className="text-xs text-destructive space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 变更预览 */}
            {hasChanges && validationErrors.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">预览更改</span>
                </div>
                <div className="text-xs bg-white rounded px-2 py-1 border">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{method}</Badge>
                    <Badge className={`text-xs ${getStatusCodeColor(statusCode)}`}>
                      {statusCode}
                    </Badge>
                    <span className="font-mono truncate flex-1">{url}</span>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    <span className="font-medium">{title}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 对话框底部按钮 */}
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={updateEndpoint.isPending}
            >
              取消
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={resetForm}
              disabled={updateEndpoint.isPending || !hasChanges}
            >
              重置
            </Button>
            <Button 
              type="submit" 
              disabled={
                updateEndpoint.isPending || 
                validationErrors.length > 0 ||
                !hasChanges
              }
              className="min-w-[100px]"
            >
              {updateEndpoint.isPending ? (
                <>
                  <LoadingSpinner/>
                  保存中...
                </>
              ) : (
                <>
                  <Save/>
                  保存更改
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
