'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// 工作流分类选项
const WORKFLOW_CATEGORIES = [
  '网络扫描',
  '漏洞检测',
  '信息收集',
  '安全评估',
  'Web安全',
  '其他'
] as const

interface SaveWorkflowDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; description: string; category: string }) => Promise<void>
  defaultName?: string
  defaultDescription?: string
  defaultCategory?: string
}

export function SaveDialog({
  isOpen,
  onClose,
  onSave,
  defaultName = '',
  defaultDescription = '',
  defaultCategory = '网络扫描'
}: SaveWorkflowDialogProps) {
  const [name, setName] = useState(defaultName)
  const [description, setDescription] = useState(defaultDescription)
  const [category, setCategory] = useState(defaultCategory)
  const [isSaving, setIsSaving] = useState(false)

  // 重置表单
  const resetForm = () => {
    setName(defaultName)
    setDescription(defaultDescription)
    setCategory(defaultCategory)
    setIsSaving(false)
  }

  // 处理对话框关闭
  const handleClose = () => {
    if (isSaving) return // 保存中不允许关闭
    resetForm()
    onClose()
  }

  // 处理保存
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('请输入工作流名称')
      return
    }

    const saveData = {
      name: name.trim(),
      description: description.trim(),
      category: category
    }

    // 打印用户输入的数据到控制台
    console.log('=== 保存工作流对话框 - 用户输入数据 ===')
    console.log('用户输入:', saveData)
    console.log('==========================================')

    try {
      setIsSaving(true)
      await onSave(saveData)

      toast.success('工作流保存成功')
      handleClose()
    } catch (error) {
      console.error('保存工作流失败:', error)
      toast.error(error instanceof Error ? error.message : '保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-blue-600" />
            保存工作流
          </DialogTitle>
          <DialogDescription>
            为您的工作流设置名称和描述，便于后续管理和使用。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 工作流名称 */}
          <div className="space-y-2">
            <Label htmlFor="workflow-name" className="text-sm font-medium">
              工作流名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="workflow-name"
              placeholder="请输入工作流名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              className="w-full"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {name.length}/100 字符
            </p>
          </div>

          {/* 工作流分类 */}
          <div className="space-y-2">
            <Label htmlFor="workflow-category" className="text-sm font-medium">
              工作流分类 <span className="text-red-500">*</span>
            </Label>
            <Select value={category} onValueChange={setCategory} disabled={isSaving}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择工作流分类" />
              </SelectTrigger>
              <SelectContent>
                {WORKFLOW_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 工作流描述 */}
          <div className="space-y-2">
            <Label htmlFor="workflow-description" className="text-sm font-medium">
              工作流描述
            </Label>
            <Textarea
              id="workflow-description"
              placeholder="请输入工作流描述（可选）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              className="w-full min-h-[80px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 字符
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="min-w-[80px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                保存
              </>
            )}
          </Button>
        </DialogFooter>

        {/* 快捷键提示 */}
        <div className="text-xs text-muted-foreground text-center border-t pt-3">
          提示：按 <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+Enter</kbd> 快速保存
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 使用命名导出以保持一致性