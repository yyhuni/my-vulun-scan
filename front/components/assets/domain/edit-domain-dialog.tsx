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
import type { Domain } from "@/types/domain.types"

// 组件属性类型定义
interface EditDomainDialogProps {
  domain: Domain                              // 要编辑的域名数据
  open: boolean                               // 对话框开关状态
  onOpenChange: (open: boolean) => void       // 对话框状态变化回调
  onEdit: (domain: Domain) => void            // 编辑成功回调函数
}

/**
 * 编辑域名对话框组件
 * 提供编辑现有域名的表单界面
 * 
 * 功能特性：
 * 1. 预填充现有数据
 * 2. 表单验证
 * 3. 错误处理
 * 4. 加载状态
 * 5. 变更检测
 */
export function EditDomainDialog({ 
  domain, 
  open, 
  onOpenChange, 
  onEdit 
}: EditDomainDialogProps) {
  // 表单数据状态
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  // 使用 React Query 的更新域名 mutation
  const updateDomain = useUpdateDomain()

  // 当域名数据变化时更新表单
  useEffect(() => {
    if (domain) {
      setFormData({
        name: domain.name || "",
        description: domain.description || "",
      })
    }
  }, [domain])

  // 检查表单是否有变更
  const hasChanges = () => {
    return (
      formData.name.trim() !== domain.name ||
      formData.description.trim() !== domain.description
    )
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 表单验证
    if (!formData.name.trim()) {
      return
    }

    // 检查是否有变更
    if (!hasChanges()) {
      return
    }

    // 使用 React Query mutation
    updateDomain.mutate(
      {
        id: Number(domain.id),
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
      name: domain.name || "",
      description: domain.description || "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>编辑域名</span>
          </DialogTitle>
          <DialogDescription>
            修改域名的基本信息。标有 * 的字段为必填项。
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 域名名称输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                域名 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="请输入域名"
                disabled={updateDomain.isPending}
                className="font-mono"
                required
              />
            </div>
            
            {/* 域名描述输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="edit-description">域名描述</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="请输入域名描述（可选）"
                disabled={updateDomain.isPending}
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
              disabled={updateDomain.isPending || !formData.name.trim() || !hasChanges()}
            >
              {updateDomain.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  更新中...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  更新域名
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
