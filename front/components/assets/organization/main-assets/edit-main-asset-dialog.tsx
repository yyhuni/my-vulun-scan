"use client"

import React, { useState, useEffect } from "react"
import { Edit, Globe } from "lucide-react"

// 导入 UI 组件
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/loading-spinner"

// 导入 React Query Hook
import { useUpdateDomain } from "@/hooks/use-domains"
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

// 导入类型定义
import type { Asset } from "@/types/asset.types"

// 组件属性类型定义
interface EditMainAssetDialogProps {
  asset: Asset                                     // 要编辑的主资产数据
  open: boolean                                    // 对话框开关状态
  onOpenChange: (open: boolean) => void            // 对话框状态变化回调
  onEdit: (asset: Asset) => void                   // 编辑成功回调函数
}

/**
 * 编辑主资产对话框组件
 * 提供编辑现有主资产的表单界面
 * 
 * 功能特性：
 * 1. 预填充现有数据
 * 2. 表单验证
 * 3. 错误处理
 * 4. 加载状态
 * 5. 变更检测
 * 6. 域名格式验证
 */
export function EditMainAssetDialog({ 
  asset, 
  open, 
  onOpenChange, 
  onEdit 
}: EditMainAssetDialogProps) {
  // 表单数据状态
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  // 使用 React Query 的更新域名 mutation
  const updateDomain = useUpdateDomain()

  // 表单验证错误状态
  const [errors, setErrors] = useState({
    name: "",
    description: "",
  })

  // 当资产数据变化时更新表单
  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || "",
        description: asset.description || "",
      })
      // 清除错误状态
      setErrors({
        name: "",
        description: "",
      })
    }
  }, [asset])

  // 域名格式验证
  const validateDomainName = (name: string): string => {
    const trimmedName = name.trim()
    
    if (!trimmedName) {
      return "域名不能为空"
    }
    
    if (trimmedName.length < 3) {
      return "域名长度不能少于3个字符"
    }
    
    if (trimmedName.length > 100) {
      return "域名长度不能超过100个字符"
    }
    
    // 基本域名格式验证
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!domainRegex.test(trimmedName)) {
      return "请输入有效的域名格式（如：example.com）"
    }
    
    return ""
  }

  // 描述验证
  const validateDescription = (description: string): string => {
    if (description.length > 500) {
      return "描述长度不能超过500个字符"
    }
    return ""
  }

  // 检查表单是否有变更
  const hasChanges = () => {
    return (
      formData.name.trim() !== asset.name ||
      formData.description.trim() !== (asset.description || "")
    )
  }

  // 验证整个表单
  const validateForm = (): boolean => {
    const nameError = validateDomainName(formData.name)
    const descriptionError = validateDescription(formData.description)
    
    setErrors({
      name: nameError,
      description: descriptionError,
    })
    
    return !nameError && !descriptionError
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 表单验证
    if (!validateForm()) {
      return
    }

    // 检查是否有变更
    if (!hasChanges()) {
      return
    }

    // 使用 React Query mutation
    updateDomain.mutate(
      {
        id: Number(asset.id),
        data: {
          name: formData.name.trim(),
          description: formData.description.trim(),
        }
      },
      {
        onSuccess: (response) => {
          if (response.state === "success" && response.data) {
            // 调用成功回调
            onEdit(response.data)
            
            // 关闭对话框
            onOpenChange(false)
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
    
    // 实时验证
    if (field === 'name') {
      const error = validateDomainName(value)
      setErrors(prev => ({ ...prev, name: error }))
    } else if (field === 'description') {
      const error = validateDescription(value)
      setErrors(prev => ({ ...prev, description: error }))
    }
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!updateDomain.isPending) {
      onOpenChange(newOpen)
    }
  }

  // 重置表单到原始状态
  const handleReset = () => {
    setFormData({
      name: asset.name || "",
      description: asset.description || "",
    })
    setErrors({
      name: "",
      description: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>编辑主资产</span>
          </DialogTitle>
          <DialogDescription>
            修改主资产的基本信息。标有 * 的字段为必填项。
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 域名输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="edit-domain-name">
                域名 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-domain-name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="请输入域名（如：example.com）"
                disabled={updateDomain.isPending}
                maxLength={100}
                required
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <div className="text-xs text-destructive">
                  {errors.name}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {formData.name.length}/100 字符
              </div>
            </div>
            
            {/* 描述输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="edit-domain-description">描述</Label>
              <Textarea
                id="edit-domain-description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="请输入域名描述（可选）"
                disabled={updateDomain.isPending}
                rows={3}
                maxLength={500}
                className={errors.description ? "border-destructive" : ""}
              />
              {errors.description && (
                <div className="text-xs text-destructive">
                  {errors.description}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {formData.description.length}/500 字符
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
              disabled={updateDomain.isPending}
            >
              取消
            </Button>
            
            {hasChanges() && (
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleReset}
                disabled={updateDomain.isPending}
              >
                重置
              </Button>
            )}
            
            <Button 
              type="submit" 
              disabled={updateDomain.isPending || !formData.name.trim() || !hasChanges() || !!errors.name || !!errors.description}
            >
              {updateDomain.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  更新中...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  更新主资产
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
