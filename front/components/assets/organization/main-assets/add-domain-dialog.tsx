"use client" // 标记为客户端组件，可以使用浏览器 API 和交互功能

// 导入 React 核心库
import React, { useState } from "react"
// 导入提示组件
import { toast } from "sonner"
// 导入图标组件
import { Plus, Globe } from "lucide-react"

// 导入 UI 组件
import { Button } from "@/components/ui/button"
// 导入API服务
import { DomainService } from "@/services/domain.service"
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
import type { Asset } from "@/types/asset.types"

// 组件属性类型定义
interface AddDomainDialogProps {
  organizationId: string                       // 组织ID
  onAdd: (domains: Asset[]) => void           // 添加成功回调函数
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
  organizationId, 
  onAdd, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange 
}: AddDomainDialogProps) {
  // 对话框开关状态 - 支持外部控制
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  // 提交加载状态
  const [isSubmitting, setIsSubmitting] = useState(false)
  // 域名文本输入
  const [domainsText, setDomainsText] = useState("")

  // 验证域名格式
  const validateDomainName = (name: string): boolean => {
    // 基本的域名格式验证
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    return domainRegex.test(name)
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 解析域名文本，每行一个域名
    const domainLines = domainsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
    
    if (domainLines.length === 0) {
      toast.error("请至少输入一个域名")
      return
    }

    // 验证每个域名格式
    const invalidDomains: string[] = []
    for (const domain of domainLines) {
      if (!validateDomainName(domain)) {
        invalidDomains.push(domain)
      }
    }

    if (invalidDomains.length > 0) {
      toast.error(`以下域名格式不正确: ${invalidDomains.join(', ')}`)
      return
    }

    setIsSubmitting(true)

    try {
      // 创建域名
      const response = await DomainService.createDomains({
        domains: domainLines.map(name => ({
          name: name,
          description: "",
        })),
        organizationId: parseInt(organizationId)
      })
      
      if (response.state === "success" && response.data) {
        // 调用成功回调
        onAdd(response.data)
        
        // 重置表单
        setDomainsText("")
        
        // 关闭对话框
        setOpen(false)
        
        // 显示成功提示
        toast.success(`成功添加 ${response.data.length} 个域名`)
      } else {
        throw new Error(response.message || "创建域名失败")
      }
      
    } catch (error: any) {
      console.error("创建域名失败:", error)
      toast.error(`创建域名失败: ${error.message || "未知错误"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      setOpen(newOpen)
      if (!newOpen) {
        // 关闭时重置表单
        setDomainsText("")
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
            添加主资产
          </Button>
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>添加主资产(域名)</span>
          </DialogTitle>
          <DialogDescription>
            每行输入一个域名,支持批量添加。例如: example.com
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 域名输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="domains">
                域名列表 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="domains"
                value={domainsText}
                onChange={(e) => setDomainsText(e.target.value)}
                placeholder={"example.com\napi.example.com\ntest.example.com\nwww.example.com\napp.example.com"}
                disabled={isSubmitting}
                rows={15}
                className="font-mono text-sm"
              />
              <div className="text-xs text-muted-foreground">
                共 {domainsText.split('\n').filter(line => line.trim()).length} 个域名
              </div>
            </div>
          </div>
          
          {/* 对话框底部按钮 */}
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !domainsText.trim()}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
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
