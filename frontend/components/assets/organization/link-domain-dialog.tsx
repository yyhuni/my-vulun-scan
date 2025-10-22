"use client"

import React, { useState } from "react"
import { Link as LinkIcon, Globe, Building2, AlertCircle, Loader2, Plus, X, ChevronLeft, ChevronRight } from "lucide-react"

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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// 导入 React Query Hooks
import { useBatchLinkDomainsToOrganization } from "@/hooks/use-organizations"
import { useAllDomains } from "@/hooks/use-domains"
import type { Domain } from "@/types/domain.types"

// 组件属性类型定义
interface LinkDomainDialogProps {
  organizationId: number           // 组织ID
  organizationName: string          // 组织名称
  linkedDomainIds?: number[]        // 已关联的域名ID列表
  onLink?: () => void               // 关联成功回调
  open?: boolean                    // 外部控制对话框开关状态
  onOpenChange?: (open: boolean) => void // 外部控制对话框开关回调
}

/**
 * 关联域名对话框组件（使用 React Query）
 * 
 * 功能特性：
 * 1. 从已存在的域名中选择并关联到组织
 * 2. 过滤已关联的域名
 * 3. 支持搜索域名
 * 4. 自动管理提交状态
 * 5. 自动错误处理和成功提示
 */
export function LinkDomainDialog({ 
  organizationId,
  organizationName,
  linkedDomainIds = [],
  onLink,
  open: externalOpen, 
  onOpenChange: externalOnOpenChange,
}: LinkDomainDialogProps) {
  // 对话框开关状态 - 支持外部控制
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  // 选中的域名ID列表（多选）
  const [selectedDomainIds, setSelectedDomainIds] = useState<number[]>([])
  
  // 已选择的域名完整信息 Map（用于跨页显示）
  const [selectedDomainsMap, setSelectedDomainsMap] = useState<Map<number, Domain>>(new Map())
  
  // 搜索关键词
  const [searchKeyword, setSearchKeyword] = useState("")
  
  // 分页状态
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20) // 每页显示数量，默认20
  
  // 使用 React Query 获取域名列表
  // 性能优化：
  // 1. 只在弹窗打开时才发送请求
  // 2. 如果有缓存数据（预加载），立即显示，避免加载闪烁
  const { 
    data: domainsData, 
    isLoading: isLoadingDomains,
    error: domainsError 
  } = useAllDomains(
    {
      page,
      pageSize,
    },
    {
      enabled: open, // 只在弹窗打开时才请求
    }
  )

  // 使用 React Query 的批量关联域名 mutation
  const batchLinkDomains = useBatchLinkDomainsToOrganization()

  // 显示所有域名，并根据搜索关键词过滤，然后排序（未关联的在前）
  const availableDomains = (domainsData?.domains.filter(
    (domain: Domain) => {
      // 根据搜索关键词过滤（前端过滤）
      if (searchKeyword.trim()) {
        const keyword = searchKeyword.toLowerCase()
        return domain.name.toLowerCase().includes(keyword)
      }
      
      return true
    }
  ) || []).sort((a, b) => {
    // 未关联的域名排在前面
    const aLinked = linkedDomainIds.includes(a.id)
    const bLinked = linkedDomainIds.includes(b.id)
    
    if (aLinked === bLinked) return 0 // 相同状态保持原顺序
    return aLinked ? 1 : -1 // 未关联的（false）排在前面
  })
  
  // 未关联的域名数量（用于空状态判断）
  const unlinkedDomainsCount = availableDomains.filter(
    (domain: Domain) => !linkedDomainIds.includes(domain.id)
  ).length
  
  // 分页信息
  const totalPages = domainsData?.pagination.totalPages || 0
  const total = domainsData?.pagination.total || 0

  // 切换域名选择
  const toggleDomainSelection = (domainId: number, domain: Domain) => {
    setSelectedDomainIds(prev => {
      if (prev.includes(domainId)) {
        // 取消选择
        return prev.filter(id => id !== domainId)
      } else {
        // 添加选择
        return [...prev, domainId]
      }
    })
    
    setSelectedDomainsMap(prev => {
      const newMap = new Map(prev)
      if (newMap.has(domainId)) {
        // 取消选择时移除
        newMap.delete(domainId)
      } else {
        // 添加选择时保存域名信息
        newMap.set(domainId, domain)
      }
      return newMap
    })
  }

  // 移除已选域名
  const removeDomain = (domainId: number) => {
    setSelectedDomainIds(prev => prev.filter(id => id !== domainId))
    setSelectedDomainsMap(prev => {
      const newMap = new Map(prev)
      newMap.delete(domainId)
      return newMap
    })
  }

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 表单验证
    if (selectedDomainIds.length === 0) {
      return
    }

    // 使用 React Query mutation
    batchLinkDomains.mutate(
      {
        organizationId,
        domainIds: selectedDomainIds,
      },
      {
        onSuccess: () => {
          // 重置选择
          setSelectedDomainIds([])
          setSelectedDomainsMap(new Map())
          
          // 关闭对话框
          setOpen(false)
          
          // 调用外部回调（如果提供）
          if (onLink) {
            onLink()
          }
        }
      }
    )
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!batchLinkDomains.isPending) {
      setOpen(newOpen)
      if (!newOpen) {
        // 关闭时重置表单
        setSelectedDomainIds([])
        setSelectedDomainsMap(new Map())
        setSearchKeyword("")
        setPage(1)
        setPageSize(20) // 重置每页数量
      }
    }
  }

  // 表单验证
  const isFormValid = selectedDomainIds.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* 触发按钮 - 仅在非外部控制时显示 */}
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm" variant="secondary">
            <LinkIcon />
            关联域名
          </Button>
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <LinkIcon />
            <span>关联域名到组织</span>
          </DialogTitle>
          <DialogDescription>
            从已存在的域名中选择并关联到 &quot;{organizationName}&quot;。标有 * 的字段为必填项。
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 组织信息（只读显示） */}
            <div className="grid gap-2">
              <Label className="flex items-center space-x-2">
                <Building2 />
                <span>目标组织</span>
              </Label>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{organizationName}</span>
              </div>
            </div>

            {/* 域名选择 */}
            <div className="grid gap-2">
              <Label htmlFor="domain" className="flex items-center space-x-2">
                <Globe />
                <span>选择域名 <span className="text-destructive">*</span></span>
              </Label>
              
              {/* 搜索框和每页数量选择 */}
              {!isLoadingDomains && !domainsError && total > 0 && (
                <div className="flex gap-2 mb-2">
                  <Input
                    type="text"
                    placeholder="搜索当前页域名..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    disabled={batchLinkDomains.isPending}
                    className="flex-1"
                  />
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value))
                      setPage(1) // 切换每页数量时重置到第一页
                    }}
                    disabled={batchLinkDomains.isPending}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20条/页</SelectItem>
                      <SelectItem value="50">50条/页</SelectItem>
                      <SelectItem value="100">100条/页</SelectItem>
                      <SelectItem value="200">200条/页</SelectItem>
                      <SelectItem value="500">500条/页</SelectItem>
                      <SelectItem value="1000">1000条/页</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* 加载状态 */}
              {isLoadingDomains && (
                <div className="flex items-center space-x-2 px-3 py-2 border rounded-md bg-muted/50">
                  <Loader2 className="animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">正在加载域名列表...</span>
                </div>
              )}
              
              {/* 错误状态 */}
              {domainsError && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>
                    加载域名列表失败，请刷新页面重试
                  </AlertDescription>
                </Alert>
              )}
              
              {/* 空状态 */}
              {!isLoadingDomains && !domainsError && availableDomains.length === 0 && (
                <Alert>
                  <AlertCircle />
                  <AlertDescription className="flex flex-col space-y-2">
                    <span>暂无域名数据</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => {
                        // 可以触发创建新域名
                        setOpen(false)
                      }}
                    >
                      <Plus />
                      创建新域名
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* 多选域名列表 */}
              {!isLoadingDomains && !domainsError && availableDomains.length > 0 && (
                <>
                  <div className="border rounded-md max-h-[300px] overflow-y-auto">
                    {availableDomains.map((domain: Domain) => (
                      <label
                        key={domain.id}
                        className={`flex items-center gap-3 p-3 border-b last:border-b-0 ${
                          linkedDomainIds.includes(domain.id) 
                            ? 'bg-muted/30 cursor-not-allowed' 
                            : 'hover:bg-muted/50 cursor-pointer'
                        }`}
                      >
                        <Checkbox
                          checked={linkedDomainIds.includes(domain.id) || selectedDomainIds.includes(domain.id)}
                          onCheckedChange={() => toggleDomainSelection(domain.id, domain)}
                          disabled={batchLinkDomains.isPending || linkedDomainIds.includes(domain.id)}
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`font-medium ${
                            linkedDomainIds.includes(domain.id) ? 'text-muted-foreground' : ''
                          }`}>{domain.name}</span>
                          {linkedDomainIds.includes(domain.id) && (
                            <Badge variant="secondary" className="text-xs">已关联</Badge>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  {/* 已选择的域名（始终显示，显示所有已选域名，不仅是当前页） */}
                  <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-primary/5 min-h-[60px]">
                    <div className="w-full text-xs font-medium text-muted-foreground mb-1">
                      已选择 {selectedDomainIds.length} 个域名：
                    </div>
                    {selectedDomainIds.length > 0 ? (
                      selectedDomainIds.map(domainId => {
                        const domain = selectedDomainsMap.get(domainId)
                        if (!domain) return null
                        return (
                          <Badge key={domainId} variant="secondary" className="px-2 py-1">
                            <span className="mr-1">{domain.name}</span>
                            <button
                              type="button"
                              onClick={() => removeDomain(domainId)}
                              className="ml-1 hover:bg-destructive/20 rounded-sm"
                              disabled={batchLinkDomains.isPending}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )
                      })
                    ) : (
                      <div className="w-full text-center text-sm text-muted-foreground/60 py-2">
                        暂无选择
                      </div>
                    )}
                  </div>
                  
                  {/* 分页和辅助信息 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      {searchKeyword.trim() ? (
                        <>
                          搜索到 {availableDomains.length} 个域名 · 可关联 {unlinkedDomainsCount} 个
                          {selectedDomainIds.length > 0 && ` · 已选择 ${selectedDomainIds.length} 个`}
                        </>
                      ) : (
                        <>
                          总计 {total} 个域名 · 可关联 {unlinkedDomainsCount} 个
                          {selectedDomainIds.length > 0 && ` · 已选择 ${selectedDomainIds.length} 个`}
                        </>
                      )}
                    </div>
                    
                    {/* 分页控件 */}
                    {totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1 || batchLinkDomains.isPending}
                          className="h-7 px-2"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-xs">
                          {page} / {totalPages}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages || batchLinkDomains.isPending}
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
          </div>
          
          {/* 对话框底部按钮 */}
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={batchLinkDomains.isPending}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={batchLinkDomains.isPending || !isFormValid}
            >
              {batchLinkDomains.isPending ? (
                <>
                  <LoadingSpinner/>
                  关联中...
                </>
              ) : (
                <>
                  <LinkIcon />
                  确认关联 {selectedDomainIds.length > 0 && `(${selectedDomainIds.length})`}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
