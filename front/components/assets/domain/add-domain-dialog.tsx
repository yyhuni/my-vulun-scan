"use client"

import React, { useState } from "react"
import { Plus, Globe } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoadingSpinner } from "@/components/loading-spinner"

// 导入 React Query Hooks
import { useCreateDomain } from "@/hooks/use-domains"
import { useOrganizations } from "@/hooks/use-organizations"

// 导入类型定义
import type { Domain } from "@/types/domain.types"

// 组件属性类型定义
interface AddDomainDialogProps {
  onAdd?: (domains: Domain[]) => void  // 添加成功回调函数（可选）
  open?: boolean                        // 外部控制对话框开关状态
  onOpenChange?: (open: boolean) => void // 外部控制对话框开关回调
}

/**
 * 添加域名对话框组件（使用 React Query）
 * 
 * 功能特性：
 * 1. 自动管理提交状态
 * 2. 自动错误处理和成功提示
 * 3. 自动刷新相关数据
 * 4. 支持批量添加域名（每行一个域名）
 * 5. 更好的用户体验
 */
export function AddDomainDialog({ 
  onAdd, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange 
}: AddDomainDialogProps) {
  // 对话框开关状态 - 支持外部控制
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  // 表单数据状态
  const [formData, setFormData] = useState({
    domains: "",  // 域名列表，每行一个
    description: "",
    organizationId: "",
  })

  // 使用 React Query 获取组织列表
  const { data: organizationsData } = useOrganizations({
    page: 1,
    pageSize: 100, // 获取足够多的组织用于选择
  })

  // 使用 React Query 的创建域名 mutation
  const createDomain = useCreateDomain()

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 表单验证
    if (!formData.domains.trim()) {
      return
    }

    if (!formData.organizationId) {
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
        organizationId: Number(formData.organizationId),
      },
      {
        onSuccess: (response) => {
          // 重置表单
          setFormData({
            domains: "",
            description: "",
            organizationId: "",
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
    if (!createDomain.isPending) {
      setOpen(newOpen)
      if (!newOpen) {
        // 关闭时重置表单
        setFormData({
          domains: "",
          description: "",
          organizationId: "",
        })
      }
    }
  }

  // 计算域名数量
  const domainCount = formData.domains
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0).length

  // 表单验证
  const isFormValid = formData.domains.trim().length > 0 && formData.organizationId !== ""

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* 触发按钮 - 仅在非外部控制时显示 */}
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            添加域名
          </Button>
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>添加新域名</span>
          </DialogTitle>
          <DialogDescription>
            填写域名信息以添加到系统中。支持批量添加，每行一个域名。标有 * 的字段为必填项。
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 域名输入框 - 支持多行 */}
            <div className="grid gap-2">
              <Label htmlFor="domains">
                域名 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="domains"
                value={formData.domains}
                onChange={(e) => handleInputChange("domains", e.target.value)}
                placeholder="请输入域名，每行一个&#10;例如：&#10;example.com&#10;test.com&#10;demo.org"
                disabled={createDomain.isPending}
                rows={5}
                className="font-mono"
              />
              <div className="text-xs text-muted-foreground">
                {domainCount} 个域名
              </div>
            </div>

            {/* 所属组织选择 */}
            <div className="grid gap-2">
              <Label htmlFor="organization">
                所属组织 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.organizationId}
                onValueChange={(value) => handleInputChange("organizationId", value)}
                disabled={createDomain.isPending}
              >
                <SelectTrigger id="organization">
                  <SelectValue placeholder="请选择组织" />
                </SelectTrigger>
                <SelectContent>
                  {organizationsData?.organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <LoadingSpinner size="sm" className="mr-2" />
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
