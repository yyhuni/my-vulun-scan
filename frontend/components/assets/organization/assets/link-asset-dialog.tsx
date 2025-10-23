"use client"

import React, { useState, useRef } from "react"
import { Plus, Globe, Building2, Loader2 } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import { LoadingSpinner } from "@/components/loading-spinner"
import { DomainValidator } from "@/lib/domain-validator"

// 导入 React Query Hooks
import { useCreateAsset } from "@/hooks/use-assets"

// 导入类型定义
import type { BatchCreateResponse } from "@/types/api-response.types"

// 组件属性类型定义
interface LinkAssetDialogProps {
  organizationId: number                                     // 组织ID（固定，不可修改）
  organizationName: string                                   // 组织名称
  onAdd?: (result: BatchCreateResponse) => void              // 添加成功回调，返回批量创建的统计信息
  open?: boolean                                             // 外部控制对话框开关状态
  onOpenChange?: (open: boolean) => void                     // 外部控制对话框开关回调
}

/**
 * 关联资产对话框组件（使用 React Query）
 * 
 * 功能特性：
 * 1. 批量输入资产并关联到组织
 * 2. 自动创建不存在的资产
 * 3. 自动管理提交状态
 * 4. 自动错误处理和成功提示
 * 5. 固定组织ID，不可修改
 */
export function LinkAssetDialog({ 
  organizationId,
  organizationName,
  onAdd,
  open: externalOpen, 
  onOpenChange: externalOnOpenChange,
}: LinkAssetDialogProps) {
  // 对话框开关状态 - 支持外部控制
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  // 表单数据状态
  const [formData, setFormData] = useState({
    assets: "",  // 资产列表，每行一个
    description: "",
  })
  
  // 验证错误状态
  const [invalidAssets, setInvalidAssets] = useState<Array<{ index: number; originalAsset: string; error: string }>>([])
  
  // 行号列和输入框的 ref（用于同步滚动）
  const lineNumbersRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  
  // 使用 React Query 的创建资产 mutation
  const createAsset = useCreateAsset()

  // 处理输入框变化
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    if (field === "assets") {
      const lines = value
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      if (lines.length === 0) {
        setInvalidAssets([])
        return
      }

      const results = DomainValidator.validateDomainBatch(lines)
      const invalid = results
        .filter((r) => !r.isValid)
        .map((r) => ({ index: r.index, originalAsset: r.originalDomain, error: r.error || "资产格式无效" }))
      setInvalidAssets(invalid)
    }
  }
  
  // 计算资产数量
  const assetCount = formData.assets
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0).length


  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 表单验证
    if (!formData.assets.trim()) {
      return
    }

    if (invalidAssets.length > 0) {
      return
    }

    // 解析资产列表（每行一个资产）
    const assetList = formData.assets
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(name => ({
        name,
        description: formData.description.trim() || undefined,
      }))

    if (assetList.length === 0) {
      return
    }

    // 使用 React Query mutation
    createAsset.mutate(
      {
        assets: assetList,
        organizationId: organizationId,
      },
      {
        onSuccess: (batchCreateResult) => {
          // 重置表单
          setFormData({
            assets: "",
            description: "",
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

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!createAsset.isPending) {
      setOpen(newOpen)
      if (!newOpen) {
        // 关闭时重置表单
        setFormData({
          assets: "",
          description: "",
        })
        setInvalidAssets([])
      }
    }
  }

  // 表单验证
  const isFormValid = formData.assets.trim().length > 0 && invalidAssets.length === 0
  
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
          <Button size="sm" variant="secondary">
            <Plus />
            添加资产
          </Button>
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Globe />
            <span>添加资产到组织</span>
          </DialogTitle>
          <DialogDescription>
            输入资产并关联到 &quot;{organizationName}&quot;。支持批量添加，每行一个资产。标有 * 的字段为必填项。
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
            {/* 资产输入框 - 支持多行，带行号 */}
            <div className="grid gap-2">
              <Label htmlFor="assets">
                资产 <span className="text-destructive">*</span>
              </Label>
              <div className="relative border rounded-md overflow-hidden bg-background">
                <div className="flex h-[324px]">
                  {/* 行号列 - 固定显示15行 */}
                  <div className="flex-shrink-0 w-12 bg-muted/30 border-r select-none overflow-hidden">
                    <div 
                      ref={lineNumbersRef}
                      className="py-3 px-2 text-right font-mono text-xs text-muted-foreground leading-[1.4] h-full overflow-y-auto scrollbar-hide"
                    >
                      {Array.from({ length: Math.max(formData.assets.split('\n').length, 15) }, (_, i) => (
                        <div key={i + 1} className="h-[20px]">
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 输入框 - 固定高度显示15行 */}
                  <Textarea
                    ref={textareaRef}
                    id="assets"
                    value={formData.assets}
                    onChange={(e) => handleInputChange("assets", e.target.value)}
                    onScroll={handleTextareaScroll}
                    placeholder={`请输入资产，每行一个
例如：
example.com
test.com
demo.org`}
                    disabled={createAsset.isPending}
                    className="font-mono h-full overflow-y-auto resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 leading-[1.4] text-sm py-3"
                    style={{ lineHeight: '20px' }}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {assetCount} 个资产
              </div>
              {invalidAssets.length > 0 && (
                <div className="text-xs text-destructive">
                  {invalidAssets.length} 个无效资产，例如 第 {invalidAssets[0].index + 1} 行: &quot;{invalidAssets[0].originalAsset}&quot; - {invalidAssets[0].error}
                </div>
              )}
            </div>

            {/* 所属组织（只读显示） */}
            <div className="grid gap-2">
              <Label className="flex items-center space-x-2">
                <Building2 />
                <span>所属组织</span>
              </Label>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{organizationName}</span>
              </div>
            </div>
            
            {/* 资产描述输入框 */}
            <div className="grid gap-2">
              <Label htmlFor="description">资产描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="请输入资产描述（可选，将应用于所有资产）"
                disabled={createAsset.isPending}
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
              disabled={createAsset.isPending}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={createAsset.isPending || !isFormValid}
            >
              {createAsset.isPending ? (
                <>
                  <LoadingSpinner/>
                  创建中...
                </>
              ) : (
                <>
                  <Plus />
                  创建资产
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
