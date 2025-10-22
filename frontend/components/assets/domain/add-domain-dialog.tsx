"use client"

import React, { useState, useRef } from "react"
import { Plus, Globe, Building2, AlertCircle, Loader2, Check, ChevronsUpDown } from "lucide-react"

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { LoadingSpinner } from "@/components/loading-spinner"
import { DomainValidator } from "@/lib/domain-validator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// 导入 React Query Hooks
import { useCreateDomain } from "@/hooks/use-domains"
import { useOrganizations } from "@/hooks/use-organizations"

// 导入类型定义
import type { BatchCreateResponse } from "@/types/api-response.types"

// 组件属性类型定义
interface AddDomainDialogProps {
  onAdd?: (result: BatchCreateResponse) => void  // 添加成功回调，返回批量创建的统计信息
  open?: boolean                        // 外部控制对话框开关状态
  onOpenChange?: (open: boolean) => void // 外部控制对话框开关回调
  presetOrganizationId?: number         // 预设的组织ID（可选）
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
  onOpenChange: externalOnOpenChange,
  presetOrganizationId
}: AddDomainDialogProps) {
  // 对话框开关状态 - 支持外部控制
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  // 表单数据状态
  const [formData, setFormData] = useState({
    domains: "",  // 域名列表，每行一个
    description: "",
    organizationId: presetOrganizationId ? presetOrganizationId.toString() : "",
  })

  // 组织选择器状态
  const [openOrgPopover, setOpenOrgPopover] = useState(false)

  const [invalidDomains, setInvalidDomains] = useState<Array<{ index: number; originalDomain: string; error: string }>>([])

  // Popover Portal 容器（挂载到对话框内部，避免滚动被锁定）
  const popoverContainerRef = useRef<HTMLDivElement | null>(null)
  
  // 同步 presetOrganizationId 的变化
  React.useEffect(() => {
    if (presetOrganizationId) {
      setFormData(prev => ({
        ...prev,
        organizationId: presetOrganizationId.toString()
      }))
    }
  }, [presetOrganizationId])

  // 使用 React Query 获取组织列表
  const { 
    data: organizationsData, 
    isLoading: isLoadingOrganizations,
    error: organizationsError 
  } = useOrganizations(
    {
      page: 1,
      pageSize: 1000, // 获取足够多的组织用于选择
    }
  )

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
        organizationId: Number(formData.organizationId),
      },
      {
        onSuccess: (batchCreateResult) => {
          // 重置表单
          setFormData({
            domains: "",
            description: "",
            organizationId: "",
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

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!createDomain.isPending) {
      setOpen(newOpen)
      if (!newOpen) {
        // 关闭时重置表单，但保留预设的组织ID
        setFormData({
          domains: "",
          description: "",
          organizationId: presetOrganizationId ? presetOrganizationId.toString() : "",
        })
        setOpenOrgPopover(false)
        setInvalidDomains([])
      }
    }
  }

  // 计算域名数量
  const domainCount = formData.domains
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0).length

  // 表单验证
  const isFormValid = formData.domains.trim().length > 0 && formData.organizationId !== "" && invalidDomains.length === 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* 触发按钮 - 仅在非外部控制时显示 */}
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus />
            添加域名
          </Button>
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Globe />
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
                placeholder={`请输入域名，每行一个
例如：
example.com
test.com
demo.org`}
                disabled={createDomain.isPending}
                rows={5}
                className="font-mono"
              />
              <div className="text-xs text-muted-foreground">
                {domainCount} 个域名
              </div>
              {invalidDomains.length > 0 && (
                <div className="text-xs text-destructive">
                  {invalidDomains.length} 个无效域名，例如 第 {invalidDomains[0].index + 1} 行: &quot;{invalidDomains[0].originalDomain}&quot; - {invalidDomains[0].error}
                </div>
              )}
            </div>

            {/* 所属组织选择 */}
            <div className="grid gap-2">
              <Label htmlFor="organization" className="flex items-center space-x-2">
                <Building2 />
                <span>所属组织 <span className="text-destructive">*</span></span>
              </Label>
              
              {/* 加载状态 */}
              {isLoadingOrganizations && (
                <div className="flex items-center space-x-2 px-3 py-2 border rounded-md bg-muted/50">
                  <Loader2 className="animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">正在加载组织列表...</span>
                </div>
              )}
              
              {/* 错误状态 */}
              {organizationsError && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>
                    加载组织列表失败，请刷新页面重试
                  </AlertDescription>
                </Alert>
              )}
              
              {/* 空状态 */}
              {!isLoadingOrganizations && !organizationsError && organizationsData?.organizations.length === 0 && (
                <Alert>
                  <AlertCircle />
                  <AlertDescription className="flex flex-col space-y-2">
                    <span>暂无可用组织，请先创建组织</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => {
                        // 跳转到组织管理页面
                        window.open('/assets/organization', '_blank')
                      }}
                    >
                      <Plus />
                      创建组织
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* 可搜索的组织选择器 */}
              {!isLoadingOrganizations && !organizationsError && organizationsData && organizationsData.organizations.length > 0 && (
                <>
                  <div ref={popoverContainerRef}>
                  <Popover open={openOrgPopover} onOpenChange={setOpenOrgPopover} modal={false}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openOrgPopover}
                        className="w-full justify-between"
                        disabled={createDomain.isPending || !!presetOrganizationId}
                      >
                        {formData.organizationId
                          ? organizationsData.organizations.find(
                              (org) => org.id.toString() === formData.organizationId
                            )?.name
                          : "请选择组织"}
                        <ChevronsUpDown className="shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[600px] p-0" align="start" container={popoverContainerRef.current}>
                      <Command>
                        <CommandInput placeholder="搜索组织..." />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty>未找到匹配的组织</CommandEmpty>
                          <CommandGroup>
                            {organizationsData.organizations.map((org) => (
                              <CommandItem
                                key={org.id}
                                value={org.name}
                                onSelect={() => {
                                  handleInputChange("organizationId", org.id.toString())
                                  setOpenOrgPopover(false)
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    formData.organizationId === org.id.toString()
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{org.name}</span>
                                  {org.description && (
                                    <span className="text-xs text-muted-foreground truncate">
                                      {org.description}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  </div>
                  
                  {/* 辅助信息 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {presetOrganizationId ? "组织已预设（不可修改）" : `共 ${organizationsData.organizations.length} 个组织可选`}
                    </span>
                    {!presetOrganizationId && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => {
                          window.open('/assets/organization', '_blank')
                        }}
                      >
                        管理组织 →
                      </Button>
                    )}
                  </div>
                </>
              )}
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
