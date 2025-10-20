"use client"

import React, { useState } from "react"
import { Plus, Building2 } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LoadingSpinner } from "@/components/loading-spinner"

// 导入 React Query Hook
import { useCreateOrganization } from "@/hooks/use-organizations"

// 导入类型定义
import type { Organization } from "@/types/organization.types"

// 组件属性类型定义
interface AddOrganizationDialogProps {
  onAdd?: (organization: Organization) => void  // 添加成功回调函数（可选）
  open?: boolean                               // 外部控制对话框开关状态
  onOpenChange?: (open: boolean) => void       // 外部控制对话框开关回调
}

/**
 * 添加组织对话框组件（使用 React Query）
 * 
 * 功能特性：
 * 1. 自动管理提交状态
 * 2. 自动错误处理和成功提示
 * 3. 自动刷新相关数据
 * 4. 更好的用户体验
 */
export function AddOrganizationDialog({ 
  onAdd, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange 
}: AddOrganizationDialogProps) {
  // 对话框开关状态 - 支持外部控制
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  // 表单数据状态
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  // 使用 React Query 的创建组织 mutation
  const createOrganization = useCreateOrganization()

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 表单验证
    if (!formData.name.trim()) {
      return // React Query 会自动处理错误提示
    }

    if (formData.name.trim().length < 2) {
      return
    }

    if (formData.name.trim().length > 50) {
      return
    }

    // 使用 React Query mutation
    createOrganization.mutate(
      {
        name: formData.name.trim(),
        description: formData.description.trim(),
      },
      {
        onSuccess: (response) => {
          // 重置表单
          setFormData({
            name: "",
            description: "",
          })
          
          // 关闭对话框
          setOpen(false)
          
          // 调用外部回调（如果提供）
          if (onAdd && response.state === 'success' && response.data) {
            onAdd(response.data)
          }
        }
      }
    )
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
    if (!createOrganization.isPending) {
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

  // 表单验证
  const isFormValid = formData.name.trim().length >= 2 && formData.name.trim().length <= 50

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* 触发按钮 - 仅在非外部控制时显示 */}
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus />
            添加组织
          </Button>
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building2 />
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
                disabled={createOrganization.isPending}
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
                disabled={createOrganization.isPending}
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
              disabled={createOrganization.isPending}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={createOrganization.isPending || !isFormValid}
            >
              {createOrganization.isPending ? (
                <>
                  <LoadingSpinner/>
                  创建中...
                </>
              ) : (
                <>
                  <Plus />
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
