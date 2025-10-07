"use client"

import React, { useState, useEffect } from "react"
import { Edit, Network } from "lucide-react"

// 导入 UI 组件
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/loading-spinner"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// 导入类型定义
import type { SubDomain } from "@/types/subdomain.types"
import type { Asset } from "@/types/asset.types"

// 组件属性类型定义
interface EditSubdomainDialogProps {
  subdomain: SubDomain                             // 要编辑的子域名数据
  domains: Asset[]                                 // 可选的域名列表
  open: boolean                                    // 对话框开关状态
  onOpenChange: (open: boolean) => void            // 对话框状态变化回调
  onEdit: (subdomain: SubDomain) => void           // 编辑成功回调函数
}

/**
 * 编辑子域名对话框组件
 * 提供编辑现有子域名的表单界面
 * 
 * 功能特性：
 * 1. 预填充现有数据
 * 2. 表单验证
 * 3. 错误处理
 * 4. 加载状态
 * 5. 变更检测
 * 6. 子域名格式验证
 */
export function EditSubdomainDialog({ 
  subdomain, 
  domains,
  open, 
  onOpenChange, 
  onEdit 
}: EditSubdomainDialogProps) {
  // 表单数据状态
  const [formData, setFormData] = useState({
    name: "",
    domainId: "",
  })

  // 加载状态（暂时用于模拟）
  const [isLoading, setIsLoading] = useState(false)

  // 表单验证错误状态
  const [errors, setErrors] = useState({
    name: "",
    domainId: "",
  })

  // 当子域名数据变化时更新表单
  useEffect(() => {
    if (subdomain) {
      setFormData({
        name: subdomain.name || "",
        domainId: subdomain.domainId?.toString() || "",
      })
      // 清除错误状态
      setErrors({
        name: "",
        domainId: "",
      })
    }
  }, [subdomain])

  // 子域名格式验证
  const validateSubdomainName = (name: string): string => {
    const trimmedName = name.trim()
    
    if (!trimmedName) {
      return "子域名不能为空"
    }
    
    if (trimmedName.length < 3) {
      return "子域名长度不能少于3个字符"
    }
    
    if (trimmedName.length > 100) {
      return "子域名长度不能超过100个字符"
    }
    
    // 基本子域名格式验证
    const subdomainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
    if (!subdomainRegex.test(trimmedName)) {
      return "请输入有效的子域名格式（如：www.example.com）"
    }
    
    return ""
  }

  // 域名ID验证
  const validateDomainId = (domainId: string): string => {
    if (!domainId) {
      return "请选择所属域名"
    }
    return ""
  }

  // 检查表单是否有变更
  const hasChanges = () => {
    return (
      formData.name.trim() !== subdomain.name ||
      formData.domainId !== subdomain.domainId?.toString()
    )
  }

  // 验证整个表单
  const validateForm = (): boolean => {
    const nameError = validateSubdomainName(formData.name)
    const domainIdError = validateDomainId(formData.domainId)
    
    setErrors({
      name: nameError,
      domainId: domainIdError,
    })
    
    return !nameError && !domainIdError
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

    // 模拟API调用
    setIsLoading(true)
    
    // TODO: 接入真实API
    setTimeout(() => {
      // 模拟更新后的子域名数据
      const updatedSubdomain: SubDomain = {
        ...subdomain,
        name: formData.name.trim(),
        domainId: parseInt(formData.domainId),
        domain: domains.find(d => d.id === parseInt(formData.domainId)),
        updatedAt: new Date().toISOString(),
      }

      // 调用成功回调
      onEdit(updatedSubdomain)
      
      // 关闭对话框
      onOpenChange(false)
      setIsLoading(false)
    }, 1000)
  }

  // 处理输入框变化
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    
    // 实时验证
    if (field === 'name') {
      const error = validateSubdomainName(value)
      setErrors(prev => ({ ...prev, name: error }))
    } else if (field === 'domainId') {
      const error = validateDomainId(value)
      setErrors(prev => ({ ...prev, domainId: error }))
    }
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      onOpenChange(newOpen)
    }
  }

  // 重置表单到原始状态
  const handleReset = () => {
    setFormData({
      name: subdomain.name || "",
      domainId: subdomain.domainId?.toString() || "",
    })
    setErrors({
      name: "",
      domainId: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Network className="h-5 w-5" />
            <span>编辑子域名</span>
          </DialogTitle>
          <DialogDescription>
            修改子域名的基本信息。标有 * 的字段为必填项。
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 子域名输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="edit-subdomain-name">
                子域名 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-subdomain-name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="请输入子域名（如：www.example.com）"
                disabled={isLoading}
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
            
            {/* 域名选择 */}
            <div className="grid gap-2">
              <Label htmlFor="edit-domain-select">
                所属域名 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.domainId}
                onValueChange={(value) => handleInputChange("domainId", value)}
                disabled={isLoading}
              >
                <SelectTrigger 
                  id="edit-domain-select"
                  className={errors.domainId ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="请选择所属域名" />
                </SelectTrigger>
                <SelectContent>
                  {domains.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      暂无可用域名
                    </div>
                  ) : (
                    domains.map((domain) => (
                      <SelectItem key={domain.id} value={domain.id.toString()}>
                        {domain.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.domainId && (
                <div className="text-xs text-destructive">
                  {errors.domainId}
                </div>
              )}
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
              disabled={isLoading}
            >
              取消
            </Button>
            
            {hasChanges() && (
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleReset}
                disabled={isLoading}
              >
                重置
              </Button>
            )}
            
            <Button 
              type="submit" 
              disabled={isLoading || !formData.name.trim() || !formData.domainId || !hasChanges() || !!errors.name || !!errors.domainId}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  更新中...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  更新子域名
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
