"use client"

import React, { useState, useMemo } from "react"
import { Plus, Network, AlertCircle, Info } from "lucide-react"
import { toast } from "sonner"

// 导入 UI 组件
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Badge } from "@/components/ui/badge"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// 导入类型定义
import type { SubDomain } from '@/types/subdomain.types'
import type { Asset } from "@/types/asset.types"
import { useCreateSubdomain } from "@/hooks/use-subdomains"
// 导入验证工具
import { DomainValidator } from '@/lib/domain-validator'

// 组件属性类型定义
interface AddSubdomainDialogProps {
  organizationId: string                       // 组织ID
  domains: Asset[]                             // 可选的域名列表
  onAdd: (subdomains: SubDomain[]) => void    // 添加成功回调函数
  open?: boolean                               // 外部控制对话框开关状态
  onOpenChange?: (open: boolean) => void       // 外部控制对话框开关回调
}

/**
 * 添加子域名对话框组件
 * 提供添加新子域名的表单界面，支持批量添加
 * 
 * 功能特性：
 * 1. 支持添加多个子域名(每行一个)
 * 2. 选择所属域名
 * 3. 表单验证
 * 4. 错误处理
 * 5. 加载状态
 * 6. 用户友好的交互
 */
export function AddSubdomainDialog({ 
  organizationId, 
  domains,
  onAdd, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange 
}: AddSubdomainDialogProps) {
  // 对话框开关状态 - 支持外部控制
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  // 子域名文本输入
  const [subdomainsText, setSubdomainsText] = useState("")
  
  // 使用 React Query mutation
  const createSubdomainMutation = useCreateSubdomain()

  // 实时分析子域名输入，提取根域名分组
  const domainAnalysis = useMemo(() => {
    const lines = subdomainsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
    
    if (lines.length === 0) {
      return {
        totalCount: 0,
        grouped: new Map<string, string[]>(),
        invalid: [],
        rootDomains: []
      }
    }

    const { grouped, invalid } = DomainValidator.groupSubdomainsByRootDomain(lines)
    const rootDomains = Array.from(grouped.keys())

    return {
      totalCount: lines.length,
      grouped,
      invalid,
      rootDomains
    }
  }, [subdomainsText])


  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证是否有输入
    if (domainAnalysis.totalCount === 0) {
      toast.error('请输入至少一个子域名')
      return
    }

    // 检查是否有无效域名
    if (domainAnalysis.invalid.length > 0) {
      toast.error(`发现 ${domainAnalysis.invalid.length} 个无效域名，请检查后重试`)
      return
    }

    // 构建发送给后端的数据结构
    const domainGroups = Array.from(domainAnalysis.grouped.entries()).map(([rootDomain, subdomains]) => ({
      rootDomain,
      subdomains
    }))
    
    const requestData = {
      domainGroups
    }

    console.log('准备提交的数据：', requestData)

    toast.info('功能开发中：将创建 ' + domainAnalysis.rootDomains.length + ' 个根域名和 ' + domainAnalysis.totalCount + ' 个子域名')
    
    // TODO: 调用后端 API
    // await createSubdomainMutation.mutateAsync(requestData)
    
    // 暂时关闭对话框
    // setOpen(false)
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!createSubdomainMutation.isPending) {
      setOpen(newOpen)
      if (!newOpen) {
        // 关闭时重置表单
        setSubdomainsText("")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* 触发按钮 - 仅在非外部控制时显示 */}
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            添加子域名
          </Button>
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Network className="h-5 w-5" />
            <span>添加子域名</span>
          </DialogTitle>
          <DialogDescription>
            每行输入一个完整的子域名，系统会自动提取根域名并分组创建。格式：subdomain.domain.com（如 www.example.com、api.example.com）
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 子域名输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="subdomains">
                子域名列表 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="subdomains"
                value={subdomainsText}
                onChange={(e) => setSubdomainsText(e.target.value)}
                placeholder={"www.example.com\napi.example.com\ntest.example.com\nadmin.test.com\napi.test.com\nblog.github.io\nwww.bbc.co.uk"}
                disabled={createSubdomainMutation.isPending}
                rows={20}
                className="font-mono text-sm min-h-[400px] resize-y"
              />
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  系统会自动提取根域名并分组创建
                </span>
                <span className="font-medium text-primary">
                  共 {domainAnalysis.totalCount} 个子域名
                </span>
              </div>
            </div>

            {/* 域名分析预览 */}
            {domainAnalysis.totalCount > 0 && (
              <div className="grid gap-3 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">域名分析</span>
                </div>
                
                {/* 统计信息 */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {domainAnalysis.rootDomains.length} 个根域名
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {domainAnalysis.totalCount} 个子域名
                  </Badge>
                  {domainAnalysis.invalid.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {domainAnalysis.invalid.length} 个无效
                    </Badge>
                  )}
                </div>

                {/* 根域名列表 */}
                {domainAnalysis.rootDomains.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">将创建以下根域名：</div>
                    <div className="flex flex-wrap gap-2">
                      {domainAnalysis.rootDomains.map((rootDomain) => (
                        <Badge key={rootDomain} variant="outline" className="text-xs font-mono">
                          {rootDomain}
                          <span className="ml-1 text-muted-foreground">
                            ({domainAnalysis.grouped.get(rootDomain)?.length})
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 无效域名列表 */}
                {domainAnalysis.invalid.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-destructive">无效的域名：</div>
                    <div className="flex flex-wrap gap-2">
                      {domainAnalysis.invalid.map((invalid, index) => (
                        <Badge key={index} variant="destructive" className="text-xs font-mono">
                          {invalid || '(空)'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* 对话框底部按钮 */}
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={createSubdomainMutation.isPending}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={createSubdomainMutation.isPending || domainAnalysis.totalCount === 0 || domainAnalysis.invalid.length > 0}
            >
              {createSubdomainMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  创建子域名
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
