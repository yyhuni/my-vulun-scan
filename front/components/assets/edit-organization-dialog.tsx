"use client" // 标记为客户端组件，可以使用浏览器 API 和交互功能

// 导入 React 核心库
import React, { useState, useEffect } from "react"
// 导入提示组件
import { toast } from "sonner"
// 导入图标组件
import { Edit, Building2 } from "lucide-react"

// 导入 UI 组件
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// 组织数据类型定义
interface Organization {
  id: number
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

// 组件属性类型定义
interface EditOrganizationDialogProps {
  organization: Organization                    // 要编辑的组织数据
  open: boolean                                // 对话框开关状态
  onOpenChange: (open: boolean) => void        // 对话框状态变化回调
  onEdit: (organization: Organization) => void  // 编辑成功回调函数
}

/**
 * 编辑组织对话框组件
 * 提供编辑现有组织的表单界面
 * 
 * 功能特性：
 * 1. 预填充现有数据
 * 2. 表单验证
 * 3. 错误处理
 * 4. 加载状态
 * 5. 变更检测
 */
export function EditOrganizationDialog({ 
  organization, 
  open, 
  onOpenChange, 
  onEdit 
}: EditOrganizationDialogProps) {
  // 提交加载状态
  const [isSubmitting, setIsSubmitting] = useState(false)
  // 表单数据状态
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  // 当组织数据变化时更新表单
  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || "",
        description: organization.description || "",
      })
    }
  }, [organization])

  // 检查表单是否有变更
  const hasChanges = () => {
    return (
      formData.name.trim() !== organization.name ||
      formData.description.trim() !== organization.description
    )
  }

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

    // 检查是否有变更
    if (!hasChanges()) {
      toast.info("没有检测到任何变更")
      return
    }

    setIsSubmitting(true)

    try {
      // 模拟 API 调用 - 实际项目中替换为真实的 API 调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模拟更新成功的响应数据
      const updatedOrganization: Organization = {
        ...organization,
        name: formData.name.trim(),
        description: formData.description.trim(),
        updatedAt: new Date().toISOString(),
      }

      // 调用成功回调
      onEdit(updatedOrganization)
      
      // 显示成功提示
      toast.success(`组织 "${updatedOrganization.name}" 更新成功`)
      
    } catch (error: any) {
      console.error("更新组织失败:", error)
      toast.error(`更新组织失败: ${error.message || "未知错误"}`)
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
      onOpenChange(newOpen)
    }
  }

  // 重置表单到原始状态
  const handleReset = () => {
    setFormData({
      name: organization.name || "",
      description: organization.description || "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>编辑组织</span>
          </DialogTitle>
          <DialogDescription>
            修改组织的基本信息。标有 * 的字段为必填项。
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 组织名称输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                组织名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
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
              <Label htmlFor="edit-description">组织描述</Label>
              <Textarea
                id="edit-description"
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

            {/* 变更提示 */}
            {hasChanges() && (
              <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                检测到变更，点击更新保存修改
              </div>
            )}
          </div>
          
          {/* 对话框底部按钮 */}
          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            
            {hasChanges() && (
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleReset}
                disabled={isSubmitting}
              >
                重置
              </Button>
            )}
            
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.name.trim() || !hasChanges()}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  更新中...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  更新组织
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
