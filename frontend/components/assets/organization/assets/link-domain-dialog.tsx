"use client"

import React, { useState, useRef } from "react"
import { Plus, Globe, Building2, Loader2 } from "lucide-react"

// 导入 UI 组件
import { Button } from "@/components/ui/button"
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
import { LoadingSpinner } from "@/components/loading-spinner"
import { DomainValidator } from "@/lib/domain-validator"

// 导入 React Query Hooks
import { useCreateDomain } from "@/hooks/use-domains"

// 导入类型定义
import type { BatchCreateResponse } from "@/types/api-response.types"

// 组件属性类型定义
interface LinkDomainDialogProps {
  organizationId: number                                     // 组织ID（固定，不可修改）
  organizationName: string                                   // 组织名称
  onAdd?: (result: BatchCreateResponse) => void              // 添加成功回调，返回批量创建的统计信息
  open?: boolean                                             // 外部控制对话框开关状态
  onOpenChange?: (open: boolean) => void                     // 外部控制对话框开关回调
}

/**
 * 关联域名对话框组件（使用 React Query）
 * 
 * 功能特性：
 * 1. 批量输入域名并关联到组织
 * 2. 自动创建不存在的域名
 * 3. 自动管理提交状态
 * 4. 自动错误处理和成功提示
 * 5. 固定组织ID，不可修改
 */
export function LinkDomainDialog({ 
  organizationId,
  organizationName,
  onAdd,
  open: externalOpen, 
  onOpenChange: externalOnOpenChange,
}: LinkDomainDialogProps) {
  // 对话框开关状态 - 支持外部控制
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  // 表单数据状态
  const [formData, setFormData] = useState({
    domains: "",  // 域名列表，每行一个
    description: "",
  })
  
  // 验证错误状态
  const [invalidDomains, setInvalidDomains] = useState<Array<{ index: number; originalDomain: string; error: string }>>([])
  
  // 行号列和输入框的 ref（用于同步滚动）
  const lineNumbersRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  
  // 使用 React Query 的创建域名 mutation
  const createDomain = useCreateDomain()

  // 处理输入框变化
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    if (field === "domains") {
      const lines = value
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      if (lines.length === 0) {
        setInvalidDomains([])
        return
      }

      const results = DomainValidator.validateDomainBatch(lines)
      const invalid = results
        .filter((r) => !r.isValid)
        .map((r) => ({ index: r.index, originalDomain: r.originalDomain, error: r.error || "域名格式无效" }))
      setInvalidDomains(invalid)
    }
  }
  
  // 计算域名数量
  const domainCount = formData.domains
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0).length


  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 表单验证
    if (!formData.domains.trim()) {
      return
    }

    if (invalidDomains.length > 0) {
      return
    }

    // 解析域名列表（每行一个域名）
    const domainList = formData.domains
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(name => ({
        name,
        description: formData.description.trim() || undefined,
      }))

    if (domainList.length === 0) {
      return
    }

    // 使用 React Query mutation
    createDomain.mutate(
      {
        domains: domainList,
        organizationId: organizationId,
      },
      {
        onSuccess: (batchCreateResult) => {
          // 重置表单
          setFormData({
            domains: "",
            description: "",
          })
          
          // 关闭对话框
          setOpen(false)
          
          // 调用外部回调（如果提供）
          if (onAdd) {
            // 传递批量创建的统计信息给回调函数
            onAdd(batchCreateResult)
          }
        }
      }
    )
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!createDomain.isPending) {
      setOpen(newOpen)
      if (!newOpen) {
        // 关闭时重置表单
        setFormData({
          domains: "",
          description: "",
        })
        setInvalidDomains([])
      }
    }
  }

  // 表单验证
  const isFormValid = formData.domains.trim().length > 0 && invalidDomains.length === 0
  
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
          <Button size="sm" variant="secondary">
            <Plus />
            添加域名
          </Button>
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Globe />
            <span>添加域名到组织</span>
          </DialogTitle>
          <DialogDescription>
            输入域名并关联到 &quot;{organizationName}&quot;。支持批量添加，每行一个域名。标有 * 的字段为必填项。
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
            {/* 域名输入框 - 支持多行，带行号 */}
            <div className="grid gap-2">
              <Label htmlFor="domains">
                域名 <span className="text-destructive">*</span>
              </Label>
              <div className="relative border rounded-md overflow-hidden bg-background">
                <div className="flex h-[324px]">
                  {/* 行号列 - 固定显示15行 */}
                  <div className="flex-shrink-0 w-12 bg-muted/30 border-r select-none overflow-hidden">
                    <div 
                      ref={lineNumbersRef}
                      className="py-3 px-2 text-right font-mono text-xs text-muted-foreground leading-[1.4] h-full overflow-y-auto scrollbar-hide"
                    >
                      {Array.from({ length: Math.max(formData.domains.split('\n').length, 15) }, (_, i) => (
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
                    value={formData.domains}
                    onChange={(e) => handleInputChange("domains", e.target.value)}
                    onScroll={handleTextareaScroll}
                    placeholder={`请输入域名，每行一个
例如：
example.com
test.com
demo.org`}
                    disabled={createDomain.isPending}
                    className="font-mono h-full overflow-y-auto resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 leading-[1.4] text-sm py-3"
                    style={{ lineHeight: '20px' }}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {domainCount} 个域名
              </div>
              {invalidDomains.length > 0 && (
                <div className="text-xs text-destructive">
                  {invalidDomains.length} 个无效域名，例如 第 {invalidDomains[0].index + 1} 行: &quot;{invalidDomains[0].originalDomain}&quot; - {invalidDomains[0].error}
                </div>
              )}
            </div>

            {/* 所属组织（只读显示） */}
            <div className="grid gap-2">
              <Label className="flex items-center space-x-2">
                <Building2 />
                <span>所属组织</span>
              </Label>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{organizationName}</span>
              </div>
            </div>
            
            {/* 域名描述输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="description">域名描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="请输入域名描述（可选，将应用于所有域名）"
                disabled={createDomain.isPending}
                rows={2}
                maxLength={200}
              />
              <div className="text-xs text-muted-foreground">
                {formData.description.length}/200 字符
              </div>
            </div>
          </div>
          
          {/* 对话框底部按钮 */}
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={createDomain.isPending}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={createDomain.isPending || !isFormValid}
            >
              {createDomain.isPending ? (
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
