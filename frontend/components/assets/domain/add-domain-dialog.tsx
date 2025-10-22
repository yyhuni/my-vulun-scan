"use client"

import React, { useState, useRef } from "react"
import { Plus, Globe, Building2, AlertCircle, Loader2, Check, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  
  // 组织列表分页状态
  const [orgPage, setOrgPage] = useState(1)
  const [orgPageSize, setOrgPageSize] = useState(20) // 默认每页20个
  
  // 组织搜索关键词（用于前端过滤）
  const [orgSearchKeyword, setOrgSearchKeyword] = useState("")

  const [invalidDomains, setInvalidDomains] = useState<Array<{ index: number; originalDomain: string; error: string }>>([])

  // Popover Portal 容器（挂载到对话框内部，避免滚动被锁定）
  const popoverContainerRef = useRef<HTMLDivElement | null>(null)
  
  // 行号列和输入框的 ref（用于同步滚动）
  const lineNumbersRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  
  // 同步 presetOrganizationId 的变化
  React.useEffect(() => {
    if (presetOrganizationId) {
      setFormData(prev => ({
        ...prev,
        organizationId: presetOrganizationId.toString()
      }))
    }
  }, [presetOrganizationId])

  // 使用 React Query 获取组织列表（支持分页）
  const { 
    data: organizationsData, 
    isLoading: isLoadingOrganizations,
    error: organizationsError 
  } = useOrganizations(
    {
      page: orgPage,
      pageSize: orgPageSize,
    },
    {
      enabled: open, // 只在对话框打开时请求
    }
  )

  // 使用 React Query 的创建域名 mutation
  const createDomain = useCreateDomain()
  
  // 根据搜索关键词过滤组织（前端过滤）
  const filteredOrganizations = (organizationsData?.organizations || []).filter(org => {
    if (!orgSearchKeyword.trim()) return true
    const keyword = orgSearchKeyword.toLowerCase()
    return org.name.toLowerCase().includes(keyword) || 
           (org.description && org.description.toLowerCase().includes(keyword))
  })
  
  // 分页信息
  const orgTotalPages = organizationsData?.pagination.totalPages || 0
  const orgTotal = organizationsData?.pagination.total || 0

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
        // 重置组织分页状态
        setOrgPage(1)
        setOrgPageSize(20)
        setOrgSearchKeyword("")
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

  // 同步输入框和行号列的滚动
  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }

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
      <DialogContent className="sm:max-w-[650px]">
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
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
            {/* 域名输入框 - 支持多行，带行号 */}
            <div className="grid gap-2">
              <Label htmlFor="domains">
                域名 <span className="text-destructive">*</span>
              </Label>
              <div className="relative border rounded-md overflow-hidden bg-background">
                <div className="flex h-[324px]">
                  {/* 行号列 - 固定显示15行 */}
                  <div className="flex-shrink-0 w-12 bg-muted/30 border-r select-none overflow-hidden">
                    <div 
                      ref={lineNumbersRef}
                      className="py-3 px-2 text-right font-mono text-xs text-muted-foreground leading-[1.4] h-full overflow-y-auto scrollbar-hide"
                    >
                      {Array.from({ length: Math.max(formData.domains.split('\n').length, 15) }, (_, i) => (
                        <div key={i + 1} className="h-[20px]">
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 输入框 - 固定高度显示15行 */}
                  <Textarea
                    ref={textareaRef}
                    id="domains"
                    value={formData.domains}
                    onChange={(e) => handleInputChange("domains", e.target.value)}
                    onScroll={handleTextareaScroll}
                    placeholder={`请输入域名，每行一个
例如：
example.com
test.com
demo.org`}
                    disabled={createDomain.isPending}
                    className="font-mono h-full overflow-y-auto resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 leading-[1.4] text-sm py-3"
                    style={{ lineHeight: '20px' }}
                  />
                </div>
              </div>
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
                <div className="flex items-center justify-center space-x-2 px-3 py-2 border rounded-md bg-muted/50 h-[300px]">
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
              
              {/* 可搜索的组织选择器（支持分页） */}
              {!isLoadingOrganizations && !organizationsError && organizationsData && organizationsData.organizations.length > 0 && (
                <>
                  {/* 搜索框和每页数量选择 */}
                  {!presetOrganizationId && (
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="搜索当前页组织..."
                        value={orgSearchKeyword}
                        onChange={(e) => setOrgSearchKeyword(e.target.value)}
                        disabled={createDomain.isPending}
                        className="flex-1"
                      />
                      <Select
                        value={orgPageSize.toString()}
                        onValueChange={(value) => {
                          setOrgPageSize(Number(value))
                          setOrgPage(1) // 切换每页数量时重置到第一页
                        }}
                        disabled={createDomain.isPending}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="20">20条/页</SelectItem>
                          <SelectItem value="50">50条/页</SelectItem>
                          <SelectItem value="100">100条/页</SelectItem>
                          <SelectItem value="200">200条/页</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* 组织列表 - 网格布局，每行两个 */}
                  <div className="border rounded-md max-h-[300px] overflow-y-auto p-2">
                    {filteredOrganizations.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        未找到匹配的组织
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {filteredOrganizations.map((org) => (
                          <button
                            key={org.id}
                            type="button"
                            onClick={() => {
                              if (!presetOrganizationId) {
                                handleInputChange("organizationId", org.id.toString())
                              }
                            }}
                            disabled={createDomain.isPending || !!presetOrganizationId}
                            className={cn(
                              "flex items-center gap-2 p-3 rounded-md border text-left",
                              formData.organizationId === org.id.toString()
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-muted/50 border-border",
                              (createDomain.isPending || presetOrganizationId) && "cursor-not-allowed opacity-60"
                            )}
                          >
                            <Check
                              className={cn(
                                "shrink-0 h-4 w-4",
                                formData.organizationId === org.id.toString()
                                  ? "opacity-100 text-primary"
                                  : "opacity-0"
                              )}
                            />
                            <span className="font-medium truncate text-sm">{org.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* 分页和辅助信息 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      {presetOrganizationId ? (
                        "组织已预设（不可修改）"
                      ) : orgSearchKeyword.trim() ? (
                        `搜索到 ${filteredOrganizations.length} 个组织`
                      ) : (
                        `总计 ${orgTotal} 个组织`
                      )}
                    </div>
                    
                    {/* 分页控件 */}
                    {!presetOrganizationId && orgTotalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setOrgPage(p => Math.max(1, p - 1))}
                          disabled={orgPage === 1 || createDomain.isPending}
                          className="h-7 px-2"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-xs">
                          {orgPage} / {orgTotalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setOrgPage(p => Math.min(orgTotalPages, p + 1))}
                          disabled={orgPage === orgTotalPages || createDomain.isPending}
                          className="h-7 px-2"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
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
