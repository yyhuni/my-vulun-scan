"use client"

import React, { useState, useEffect } from "react"
import { Plus, Link, AlertCircle } from "lucide-react"

// 导入 UI 组件
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// 导入 React Query Hook
import { useCreateEndpoint } from "@/hooks/use-endpoints"
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
import type { Endpoint, CreateEndpointRequest } from "@/types/endpoint.types"
// 导入 URL 验证工具
import { UrlValidator } from "@/lib/url-validator"
import { getDomain } from "tldts"

// 组件属性类型定义
interface AddEndpointDialogProps {
  domainId?: string                            // 域名ID（可选，仅用于兼容性）
  currentDomainName?: string                   // 当前域名名称（用于校验 URL）
  onAdd: (endpoints: Endpoint[]) => void      // 添加成功回调函数
  open?: boolean                               // 外部控制对话框开关状态
  onOpenChange?: (open: boolean) => void       // 外部控制对话框开关回调
}



/**
 * 添加 Endpoint 对话框组件
 * 提供添加新 Endpoint 的表单界面，支持批量添加
 * 
 * 功能特性：
 * 1. 支持添加多个 Endpoint (每行一个URL)
 * 2. 完全自动化：从 URL 自动提取域名和子域名
 * 3. 表单验证
 * 4. 错误处理
 * 5. 加载状态
 * 6. 用户友好的交互
 */
export function AddEndpointDialog({ 
  domainId,
  currentDomainName,
  onAdd, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange 
}: AddEndpointDialogProps) {
  // 对话框开关状态 - 支持外部控制
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  // 表单状态
  const [urlsText, setUrlsText] = useState("")
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [parsedUrls, setParsedUrls] = useState<string[]>([])
  
  // 可选字段状态
  const [method, setMethod] = useState<string>("GET")
  const [statusCode, setStatusCode] = useState<string>("")
  const [title, setTitle] = useState<string>("")
  const [contentLength, setContentLength] = useState<string>("")

  // 使用 React Query 的创建 Endpoint mutation
  const createEndpoint = useCreateEndpoint()

  // 实时验证 URLs - 使用严格的验证工具
  useEffect(() => {
    const urls = urlsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
    
    setParsedUrls(urls)
    
    // 使用 UrlValidator 进行批量验证
    const validationResults = UrlValidator.validateBatch(urls)
    
    const errors: string[] = []
    validationResults.forEach((result) => {
      if (!result.isValid) {
        errors.push(`第 ${result.index + 1} 行: ${result.error} - ${result.originalUrl}`)
      }
    })
    
    // 如果指定了当前域名，验证 URL 是否属于该域名（与后端 PSL 规则一致）
    if (currentDomainName) {
      urls.forEach((url, index) => {
        try {
          const urlObj = new URL(url)
          const hostname = urlObj.hostname
          
          // 使用 tldts 提取 eTLD+1，与后端 publicsuffix 行为一致；失败则回退到原 hostname
          const urlRootDomain = getDomain(hostname) || hostname
          const currentRootDomain = getDomain(currentDomainName) || currentDomainName
          
          // 检查是否匹配
          if (urlRootDomain !== currentRootDomain) {
            errors.push(`第 ${index + 1} 行: URL 不属于当前域名 ${currentDomainName} - ${url}`)
          }
        } catch {
          // URL 解析错误已经在上面捕获
        }
      })
    }
    
    setValidationErrors(errors)
  }, [urlsText, currentDomainName])

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 解析 URL 文本，每行一个 URL
    const urlLines = urlsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
    
    if (urlLines.length === 0) {
      return
    }

    // 如果有验证错误，不允许提交
    if (validationErrors.length > 0) {
      return
    }

    // 构建 Endpoint 数据
    const endpoints: CreateEndpointRequest[] = urlLines.map(url => {
      return {
        url,
        method: method || undefined,
        statusCode: statusCode ? parseInt(statusCode) : undefined,
        title: title || undefined,
        contentLength: contentLength ? parseInt(contentLength) : undefined,
      }
    })

    // 使用 React Query mutation
    createEndpoint.mutate(
      {
        endpoints
      },
      {
        onSuccess: (response) => {
          if (response.state === "success" && response.data) {
            // 调用成功回调 - 只用于 UI 状态更新，不重复调用 API
            onAdd(response.data)
            
            // 重置表单
            resetForm()
            
            // 关闭对话框
            setOpen(false)
          }
        }
      }
    )
  }

  // 重置表单
  const resetForm = () => {
    setUrlsText("")
    setValidationErrors([])
    setParsedUrls([])
    setMethod("GET")
    setStatusCode("")
    setTitle("")
    setContentLength("")
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!createEndpoint.isPending) {
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
          <Button size="sm">
            <Plus />
            Add Endpoint
          </Button>
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Link />
            <span>Add Endpoint</span>
          </DialogTitle>
          <DialogDescription>
            每行输入一个完整 URL（如 https://example.com/api/v1/users），支持批量添加。<br />
            {currentDomainName && (
              <>
                <strong>注意：URL 必须属于当前域名 {currentDomainName} 或其子域名</strong>。<br />
              </>
            )}
            系统会自动从 URL 中提取根域名和子域名进行匹配。
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* URL 输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="urls">
                URL 列表 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="urls"
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                placeholder={`https://example.com/api/v1/users
https://example.com/api/v1/auth
https://example.com/admin/login
https://api.example.com/products
https://example.com/health
https://example.com/status`}
                disabled={createEndpoint.isPending}
                rows={15}
                style={{ minHeight: '360px' }}
                className={`font-mono text-sm ${validationErrors.length > 0 ? 'border-destructive' : ''}`}
              />
              
              {/* URL 统计和校验状态 */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                共 {parsedUrls.length} 个 URL
              </span>
              {parsedUrls.length > 0 && (
                <Badge 
                  variant={validationErrors.length === 0 ? "secondary" : "destructive"}
                  className={`text-xs ${validationErrors.length === 0 ? "bg-green-100 text-green-800 border-green-200" : ""}`}
                >
                  {validationErrors.length === 0 ? "✓ 校验通过" : `✗ ${validationErrors.length} 个错误`}
                </Badge>
              )}
            </div>

              {/* 验证错误提示 */}
            {validationErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="text-destructive" />
                  <span className="text-sm font-medium text-destructive">URL 格式错误</span>
                </div>
                <ul className="text-xs text-destructive space-y-1">
                  {validationErrors.slice(0, 5).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {validationErrors.length > 5 && (
                    <li>• 还有 {validationErrors.length - 5} 个错误...</li>
                  )}
                </ul>
              </div>
            )}
            </div>

            {/* 可选字段 - 折叠区域 */}
            <div className="grid gap-2">
              <details>
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  更多选项（可选）
                </summary>
                <div className="mt-3 space-y-3 pl-5">
                  {/* HTTP Method */}
                  <div className="grid gap-2">
                    <Label htmlFor="method">
                      HTTP Method
                    </Label>
                    <Select
                      value={method}
                      onValueChange={setMethod}
                      disabled={createEndpoint.isPending}
                    >
                      <SelectTrigger id="method">
                        <SelectValue placeholder="选择 HTTP Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                        <SelectItem value="HEAD">HEAD</SelectItem>
                        <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      默认为 GET，此设置将应用到所有输入的 URL
                    </p>
                  </div>

                  {/* Status Code */}
                  <div className="grid gap-2">
                    <Label htmlFor="statusCode">
                      HTTP 状态码
                    </Label>
                    <Input
                      id="statusCode"
                      type="number"
                      value={statusCode}
                      onChange={(e) => setStatusCode(e.target.value)}
                      placeholder="例如: 200"
                      disabled={createEndpoint.isPending}
                      min="100"
                      max="599"
                    />
                    <p className="text-xs text-muted-foreground">
                      HTTP 响应状态码（100-599）
                    </p>
                  </div>

                  {/* Title */}
                  <div className="grid gap-2">
                    <Label htmlFor="title">
                      标题
                    </Label>
                    <Input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="例如: 用户列表接口"
                      disabled={createEndpoint.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      端点的描述性标题
                    </p>
                  </div>

                  {/* Content Length */}
                  <div className="grid gap-2">
                    <Label htmlFor="contentLength">
                      内容大小（字节）
                    </Label>
                    <Input
                      id="contentLength"
                      type="number"
                      value={contentLength}
                      onChange={(e) => setContentLength(e.target.value)}
                      placeholder="例如: 1024"
                      disabled={createEndpoint.isPending}
                      min="0"
                    />
                    <p className="text-xs text-muted-foreground">
                      响应内容大小（字节数）
                    </p>
                  </div>
                </div>
              </details>
            </div>
          </div>
          
          {/* 对话框底部按钮 */}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={createEndpoint.isPending}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={
                createEndpoint.isPending || 
                !urlsText.trim() || 
                parsedUrls.length === 0 || 
                validationErrors.length > 0
              }
              className="min-w-[120px]"
            >
              {createEndpoint.isPending ? (
                <>
                  <LoadingSpinner/>
                  创建中...
                </>
              ) : (
                <>
                  <Plus />
                  Add {parsedUrls.length > 0 ? `${parsedUrls.length} 个` : ''} URL
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
