"use client"

import React, { useState, useMemo } from "react"
import { Plus, Network, AlertCircle, Info, X } from "lucide-react"
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
import { useCreateSubdomainForDomain } from "@/hooks/use-subdomains"
// 导入验证工具
import { DomainValidator } from '@/lib/domain-validator'

// 组件属性类型定义
interface AddSubdomainDialogProps {
  organizationId?: string                      // 组织ID（用于获取域名列表）
  domainId?: string                            // 域名ID（可选）
  domainName?: string                          // 域名名称（可选，用于验证）
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
  domainId,
  domainName,
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
  const createSubdomainMutation = useCreateSubdomainForDomain()

  // 实时分析子域名输入
  const domainAnalysis = useMemo(() => {
    const lines = subdomainsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
    
    if (lines.length === 0) {
      return {
        totalCount: 0,
        valid: [],
        invalid: []
      }
    }

    const valid: string[] = []
    const invalid: string[] = []

    lines.forEach((subdomain) => {
      const basic = DomainValidator.validateSubdomain(subdomain)
      if (!basic.isValid) {
        invalid.push(subdomain)
        return
      }
      valid.push(subdomain)
    })

    return {
      totalCount: lines.length,
      valid,
      invalid
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

    // 检查是否有无效域名格式
    if (domainAnalysis.invalid.length > 0) {
      toast.error(`发现 ${domainAnalysis.invalid.length} 个无效子域名格式`)
      return
    }

    // 检查是否有有效的子域名
    if (domainAnalysis.valid.length === 0) {
      toast.error('没有有效的子域名')
      return
    }

    // TODO: 调用后端批量创建子域名API
    toast.info('提交子域名列表：' + domainAnalysis.valid.join(', '))
    console.log('准备提交的子域名列表:', domainAnalysis.valid)
    
    // 成功后调用回调函数
    onAdd([])
    
    // 关闭对话框
    setOpen(false)
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!createSubdomainMutation.isPending) {
      setOpen(newOpen)
      // 关闭时重置表单
      if (!newOpen) {
        setSubdomainsText('')
      }
    }
  }

  // 移除无效的子域名
  const handleRemoveInvalid = () => {
    if (domainAnalysis.valid.length === 0) {
      setSubdomainsText('')
      toast.info('已清空所有内容')
      return
    }
    
    // 只保留有效的子域名
    setSubdomainsText(domainAnalysis.valid.join('\n'))
    toast.success(`已移除 ${domainAnalysis.invalid.length} 个无效子域名`)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* 触发按钮 - 仅在非外部控制时显示 */}
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus />
            添加子域名
          </Button>
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Network />
            <span>添加子域名</span>
          </DialogTitle>
          <DialogDescription>
            每行输入一个完整的子域名（如 www.example.com、api.test.com），后端会自动识别并归属到对应的域名
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
                placeholder="www.example.com\napi.test.com\nadmin.domain.org\napp.site.net"
                disabled={createSubdomainMutation.isPending}
                rows={20}
                className="font-mono text-sm min-h-[400px] resize-y"
              />
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <AlertCircle />
                  后端会自动识别并归属域名
                </span>
                <span className="font-medium text-primary">
                  共 {domainAnalysis.totalCount} 个，有效 {domainAnalysis.valid.length} 个
                </span>
              </div>
            </div>

            {/* 域名分析预览 */}
            {domainAnalysis.totalCount > 0 && (
              <div className="grid gap-3 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Info className="text-blue-500" />
                  <span className="text-sm font-medium">验证结果</span>
                </div>
                
                {/* 统计信息 */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default" className="text-xs bg-green-600">
                    {domainAnalysis.valid.length} 个有效格式
                  </Badge>
                  {domainAnalysis.invalid.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {domainAnalysis.invalid.length} 个无效格式
                    </Badge>
                  )}
                </div>

                {/* 无效子域名列表 */}
                {domainAnalysis.invalid.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-destructive">格式无效的子域名：</div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleRemoveInvalid}
                        disabled={createSubdomainMutation.isPending}
                      >
                        <X />
                        移除无效项
                      </Button>
                    </div>
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
              disabled={createSubdomainMutation.isPending || domainAnalysis.valid.length === 0}
            >
              {createSubdomainMutation.isPending ? (
                <>
                  <LoadingSpinner/>
                  创建中...
                </>
              ) : (
                <>
                  <Plus />
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
