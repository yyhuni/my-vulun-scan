"use client" // 标记为客户端组件，可以使用浏览器 API 和交互功能

// 导入 React 核心库
import React, { useState } from "react"
// 导入提示组件
import { toast } from "sonner"
// 导入图标组件
import { Plus, Building2 } from "lucide-react"

// 导入 UI 组件
import { Button } from "@/components/ui/button"
// 导入API服务
import { OrganizationService } from "@/services/organization.service"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// 导入类型定义
import type { Organization } from "@/types/organization.types"

// 组件属性类型定义
interface AddOrganizationDialogProps {
  onAdd: (organization: Organization) => void  // 添加成功回调函数
  open?: boolean                               // 外部控制对话框开关状态
  onOpenChange?: (open: boolean) => void       // 外部控制对话框开关回调
}

/**
 * 添加组织对话框组件
 * 提供添加新组织的表单界面
 * 
 * 功能特性：
 * 1. 表单验证
 * 2. 错误处理
 * 3. 加载状态
 * 4. 用户友好的交互
 */
export function AddOrganizationDialog({ onAdd, open: externalOpen, onOpenChange: externalOnOpenChange }: AddOrganizationDialogProps) {
  // 对话框开关状态 - 支持外部控制
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  // 提交加载状态
  const [isSubmitting, setIsSubmitting] = useState(false)
  // 表单数据状态
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 表单验证
    if (!formData.name.trim()) {
      toast.error("请输入组织名称")
      return
    }

    if (formData.name.trim().length < 2) {
      toast.error("组织名称至少需要2个字符")
      return
    }

    if (formData.name.trim().length > 50) {
      toast.error("组织名称不能超过50个字符")
      return
    }

    setIsSubmitting(true)

    try {
      // 调用真实API创建组织
      const response = await OrganizationService.createOrganization({
        name: formData.name.trim(),
        description: formData.description.trim(),
      })
      
      if (response.state === "success" && response.data) {
        // 调用成功回调
        onAdd(response.data)
        
        // 重置表单
        setFormData({
          name: "",
          description: "",
        })
        
        // 关闭对话框
        setOpen(false)
        
        // 显示成功提示
        toast.success(`组织 "${response.data.name}" 创建成功`)
      } else {
        throw new Error(response.message || "创建组织失败")
      }
      
    } catch (error: any) {
      console.error("创建组织失败:", error)
      toast.error(`创建组织失败: ${error.message || "未知错误"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 处理输入框变化
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      setOpen(newOpen)
      if (!newOpen) {
        // 关闭时重置表单
        setFormData({
          name: "",
          description: "",
        })
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
            添加组织
          </Button>
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>添加新组织</span>
          </DialogTitle>
          <DialogDescription>
            填写组织信息以添加到系统中。标有 * 的字段为必填项。
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 组织名称输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                组织名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="请输入组织名称"
                disabled={isSubmitting}
                maxLength={50}
                required
              />
              <div className="text-xs text-muted-foreground">
                {formData.name.length}/50 字符
              </div>
            </div>
            
            {/* 组织描述输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="description">组织描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="请输入组织描述（可选）"
                disabled={isSubmitting}
                rows={3}
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
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  创建组织
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
