"use client"

import React, { useState } from "react"
import { Plus, Network } from "lucide-react"

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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
interface AddSubdomainDialogProps {
  organizationId: string                       // 组织ID
  domains: Asset[]                             // 可选的域名列表
  onAdd: (subdomains: SubDomain[]) => void    // 添加成功回调函数
  open?: boolean                               // 外部控制对话框开关状态
  onOpenChange?: (open: boolean) => void       // 外部控制对话框开关回调
}

/**
 * 添加子域名对话框组件
 * 提供添加新子域名的表单界面，支持批量添加
 * 
 * 功能特性：
 * 1. 支持添加多个子域名(每行一个)
 * 2. 选择所属域名
 * 3. 表单验证
 * 4. 错误处理
 * 5. 加载状态
 * 6. 用户友好的交互
 */
export function AddSubdomainDialog({ 
  organizationId, 
  domains,
  onAdd, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange 
}: AddSubdomainDialogProps) {
  // 对话框开关状态 - 支持外部控制
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  // 子域名文本输入
  const [subdomainsText, setSubdomainsText] = useState("")
  
  // 选中的域名ID
  const [selectedDomainId, setSelectedDomainId] = useState<string>("")
  
  // 加载状态（暂时用于模拟）
  const [isLoading, setIsLoading] = useState(false)

  // 验证子域名格式
  const validateSubdomainName = (name: string): boolean => {
    // 基本的子域名格式验证
    const subdomainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
    return subdomainRegex.test(name)
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证是否选择了域名
    if (!selectedDomainId) {
      return
    }

    // 解析子域名文本，每行一个子域名
    const subdomainLines = subdomainsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
    
    if (subdomainLines.length === 0) {
      return
    }

    // 验证每个子域名格式
    const invalidSubdomains: string[] = []
    for (const subdomain of subdomainLines) {
      if (!validateSubdomainName(subdomain)) {
        invalidSubdomains.push(subdomain)
      }
    }

    if (invalidSubdomains.length > 0) {
      return
    }

    // 模拟API调用
    setIsLoading(true)
    
    // TODO: 接入真实API
    setTimeout(() => {
      // 模拟创建的子域名数据
      const mockSubdomains: SubDomain[] = subdomainLines.map((name, index) => ({
        id: Date.now() + index,
        name: name,
        domainId: parseInt(selectedDomainId),
        domain: domains.find(d => d.id === parseInt(selectedDomainId)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))

      // 调用成功回调
      onAdd(mockSubdomains)
      
      // 重置表单
      setSubdomainsText("")
      setSelectedDomainId("")
      
      // 关闭对话框
      setOpen(false)
      setIsLoading(false)
    }, 1000)
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      setOpen(newOpen)
      if (!newOpen) {
        // 关闭时重置表单
        setSubdomainsText("")
        setSelectedDomainId("")
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
            添加子域名
          </Button>
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Network className="h-5 w-5" />
            <span>添加子域名</span>
          </DialogTitle>
          <DialogDescription>
            每行输入一个子域名,支持批量添加。例如: www.example.com 或 api.example.com
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 域名选择 */}
            <div className="grid gap-2">
              <Label htmlFor="domain-select">
                所属域名 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedDomainId}
                onValueChange={setSelectedDomainId}
                disabled={isLoading}
              >
                <SelectTrigger id="domain-select">
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
              {domains.length === 0 && (
                <div className="text-xs text-amber-600">
                  请先添加主资产(域名)后再添加子域名
                </div>
              )}
            </div>

            {/* 子域名输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="subdomains">
                子域名列表 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="subdomains"
                value={subdomainsText}
                onChange={(e) => setSubdomainsText(e.target.value)}
                placeholder={"www.example.com\napi.example.com\ntest.example.com\nadmin.example.com\napp.example.com"}
                disabled={isLoading || !selectedDomainId}
                rows={15}
                className="font-mono text-sm"
              />
              <div className="text-xs text-muted-foreground">
                共 {subdomainsText.split('\n').filter(line => line.trim()).length} 个子域名
              </div>
            </div>
          </div>
          
          {/* 对话框底部按钮 */}
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !subdomainsText.trim() || !selectedDomainId || domains.length === 0}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  创建子域名
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
