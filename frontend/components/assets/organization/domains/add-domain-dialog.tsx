"use client"

import React, { useState, useMemo, useRef } from "react"
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
import type { Domain } from '@/types/domain.types'
import { useCreateDomain } from "@/hooks/use-domains"
// 导入验证工具
import { DomainValidator } from '@/lib/domain-validator'

// 组件属性类型定义
interface AddDomainDialogProps {
  assetId?: string                             // 资产ID（可选）
  assetName?: string                           // 资产名称（可选，用于验证）
  onAdd: (domains: Domain[]) => void          // 添加成功回调函数
  open?: boolean                               // 外部控制对话框开关状态
  onOpenChange?: (open: boolean) => void       // 外部控制对话框开关回调
}

/**
 * 添加域名对话框组件
 * 提供添加新域名的表单界面，支持批量添加
 * 
 * 功能特性：
 * 1. 支持添加多个域名(每行一个)
 * 2. 表单验证
 * 3. 错误处理
 * 4. 加载状态
 * 5. 用户友好的交互
 */
export function AddDomainDialog({ 
  assetId,
  assetName,
  onAdd, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange 
}: AddDomainDialogProps) {
  // 对话框开关状态 - 支持外部控制
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  // 域名文本输入
  const [domainsText, setDomainsText] = useState("")
  
  // 行号列和输入框的 ref（用于同步滚动）
  const lineNumbersRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  
  // 使用 React Query mutation
  const createDomainMutation = useCreateDomain()

  // 实时分析域名输入
  const domainAnalysis = useMemo(() => {
    const lines = domainsText
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

    lines.forEach((domain) => {
      const basic = DomainValidator.validateDomainBatch([domain])
      if (basic.length === 0 || !basic[0].isValid) {
        invalid.push(domain)
        return
      }
      valid.push(domain)
    })

    return {
      totalCount: lines.length,
      valid,
      invalid
    }
  }, [domainsText])


  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证是否有输入
    if (domainAnalysis.totalCount === 0) {
      toast.error('请输入至少一个域名')
      return
    }

    // 检查是否有无效域名格式
    if (domainAnalysis.invalid.length > 0) {
      toast.error(`发现 ${domainAnalysis.invalid.length} 个无效域名格式`)
      return
    }

    // 检查是否有有效的域名
    if (domainAnalysis.valid.length === 0) {
      toast.error('没有有效的域名')
      return
    }

    // TODO: 调用后端批量创建域名API
    toast.info('提交域名列表：' + domainAnalysis.valid.join(', '))
    console.log('准备提交的域名列表:', domainAnalysis.valid)
    
    // 成功后调用回调函数
    onAdd([])
    
    // 关闭对话框
    setOpen(false)
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!createDomainMutation.isPending) {
      setOpen(newOpen)
      // 关闭时重置表单
      if (!newOpen) {
        setDomainsText('')
      }
    }
  }

  // 移除无效的域名
  const handleRemoveInvalid = () => {
    if (domainAnalysis.valid.length === 0) {
      setDomainsText('')
      toast.info('已清空所有内容')
      return
    }
    
    // 只保留有效的域名
    setDomainsText(domainAnalysis.valid.join('\n'))
    toast.success(`已移除 ${domainAnalysis.invalid.length} 个无效域名`)
  }

  // 同步输入框和行号列的滚动
  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* 触发按钮 - 仅在非外部控制时显示 */}
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus />
            添加域名
          </Button>
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Network />
            <span>添加域名</span>
          </DialogTitle>
          <DialogDescription>
            每行输入一个完整的域名（如 www.example.com、api.test.com）
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 域名输入框 - 支持多行，带行号 */}
            <div className="grid gap-2">
              <Label htmlFor="domains">
                域名列表 <span className="text-destructive">*</span>
              </Label>
              <div className="relative border rounded-md overflow-hidden bg-background">
                <div className="flex h-[324px]">
                  {/* 行号列 - 固定显示15行 */}
                  <div className="flex-shrink-0 w-12 bg-muted/30 border-r select-none overflow-hidden">
                    <div 
                      ref={lineNumbersRef}
                      className="py-3 px-2 text-right font-mono text-xs text-muted-foreground leading-[1.4] h-full overflow-y-auto scrollbar-hide"
                    >
                      {Array.from({ length: Math.max(domainsText.split('\n').length, 15) }, (_, i) => (
                        <div key={i + 1} className="h-[20px]">
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 输入框 - 固定高度显示15行 */}
                  <Textarea
                    ref={textareaRef}
                    id="domains"
                    value={domainsText}
                    onChange={(e) => setDomainsText(e.target.value)}
                    onScroll={handleTextareaScroll}
                    placeholder={`www.example.com\napi.test.com\nadmin.domain.org\napp.site.net`}
                    disabled={createDomainMutation.isPending}
                    className="font-mono h-full overflow-y-auto resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 leading-[1.4] text-sm py-3"
                    style={{ lineHeight: '20px' }}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {domainAnalysis.totalCount} 个域名
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <AlertCircle />
                  请输入有效的域名格式
                </span>
                <span className="font-medium text-primary">
                  有效 {domainAnalysis.valid.length} 个
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

                {/* 无效域名列表 */}
                {domainAnalysis.invalid.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-destructive">格式无效的域名：</div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleRemoveInvalid}
                        disabled={createDomainMutation.isPending}
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
              disabled={createDomainMutation.isPending}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={createDomainMutation.isPending || domainAnalysis.valid.length === 0}
            >
              {createDomainMutation.isPending ? (
                <>
                  <LoadingSpinner/>
                  创建中...
                </>
              ) : (
                <>
                  <Plus />
                  创建域名
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
