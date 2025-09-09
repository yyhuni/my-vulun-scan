/**
 * 图标选择器组件
 * 
 * 功能特性：
 * - 支持分类浏览
 * - 支持搜索过滤
 * - 支持键盘导航
 * - 响应式布局
 * - 类型安全
 */

'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  WORKFLOW_ICONS,
  searchIcons,
  getWorkflowIcon,
  getWorkflowIconInfo,
  type WorkflowIconName
} from '@/lib/icons/workflow-icons'

export interface IconSelectorProps {
  /** 当前选中的图标名称 */
  value?: WorkflowIconName
  /** 图标变化回调 */
  onValueChange?: (iconName: WorkflowIconName) => void
  /** 触发按钮的自定义内容 */
  trigger?: React.ReactNode
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
  /** 对话框标题 */
  title?: string
  /** 是否显示标签 */
  showLabel?: boolean
}

export function IconSelector({
  value = 'Terminal',
  onValueChange,
  trigger,
  disabled = false,
  className,
  title = '选择图标',
  showLabel = true
}: IconSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 获取当前选中的图标信息
  const selectedIconInfo = getWorkflowIconInfo(value)
  const SelectedIcon = getWorkflowIcon(value)

  // 获取要显示的图标
  const displayIcons = useMemo(() => {
    if (searchQuery.trim()) {
      return searchIcons(searchQuery)
    }
    return WORKFLOW_ICONS
  }, [searchQuery])

  // 处理图标选择
  const handleIconSelect = (iconName: WorkflowIconName) => {
    onValueChange?.(iconName)
    setOpen(false)
    setSearchQuery('') // 清空搜索
  }

  // 渲染图标网格
  const renderIconGrid = (icons: Record<string, any>) => {
    const iconEntries = Object.entries(icons)
    
    if (iconEntries.length === 0) {
      return (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <div className="text-center">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>未找到匹配的图标</p>
          </div>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-8 sm:grid-cols-10 lg:grid-cols-12 gap-2 p-4">
        {iconEntries.map(([iconName, iconInfo]) => {
          const IconComponent = iconInfo.icon
          const isSelected = value === iconName

          return (
            <Button
              key={iconName}
              variant={isSelected ? "default" : "outline"}
              size="icon"
              onClick={() => handleIconSelect(iconName as WorkflowIconName)}
              className={cn(
                "h-10 w-10 flex-shrink-0 relative group",
                isSelected && 'ring-2 ring-blue-500 ring-offset-1'
              )}
              title={`${iconInfo.label} - ${iconInfo.description || ''}`}
            >
              <IconComponent className="h-4 w-4" />

              {/* 悬浮提示 */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2
                            bg-black text-white text-xs px-2 py-1 rounded
                            opacity-0 group-hover:opacity-100 transition-opacity
                            pointer-events-none whitespace-nowrap z-10">
                {iconInfo.label}
              </div>
            </Button>
          )
        })}
      </div>
    )
  }

  // 默认触发按钮
  const defaultTrigger = (
    <Button 
      variant="outline" 
      className={cn("h-10 w-full flex items-center justify-between gap-2", className)}
      disabled={disabled}
    >
      <div className="flex items-center gap-2">
        <SelectedIcon className="h-4 w-4 text-muted-foreground" />
        {showLabel && (
          <span className="text-sm text-muted-foreground truncate">
            {selectedIconInfo?.label || '选择图标'}
          </span>
        )}
      </div>
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
          {/* 搜索框 */}
          <div className="px-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索图标..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 图标内容 */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="px-4 pb-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  {searchQuery.trim()
                    ? `搜索结果 (${Object.keys(displayIcons).length} 个)`
                    : `所有图标 (${Object.keys(displayIcons).length} 个)`
                  }
                </Label>
              </div>
              {renderIconGrid(displayIcons)}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 简化版图标选择器（仅显示常用图标）
export function SimpleIconSelector({
  value = 'Terminal',
  onValueChange,
  className
}: Pick<IconSelectorProps, 'value' | 'onValueChange' | 'className'>) {
  const [open, setOpen] = useState(false)
  
  // 常用图标列表
  const commonIcons = [
    'Terminal', 'Shield', 'Network', 'Bug', 'Eye', 'Database',
    'FileText', 'Settings', 'Code', 'Workflow', 'Search', 'Server'
  ] as WorkflowIconName[]

  const SelectedIcon = getWorkflowIcon(value)
  const selectedIconInfo = getWorkflowIconInfo(value)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("h-8 w-full flex items-center justify-start gap-2", className)}>
          <SelectedIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground truncate">
            {selectedIconInfo?.label}
          </span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>选择图标</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-6 gap-3 py-4">
          {commonIcons.map((iconName) => {
            const iconInfo = getWorkflowIconInfo(iconName)
            const IconComponent = getWorkflowIcon(iconName)
            const isSelected = value === iconName
            
            return (
              <Button
                key={iconName}
                variant={isSelected ? "default" : "outline"}
                size="icon"
                onClick={() => {
                  onValueChange?.(iconName)
                  setOpen(false)
                }}
                className={cn(
                  "h-12 w-12 flex-shrink-0",
                  isSelected && 'ring-2 ring-blue-500'
                )}
                title={iconInfo?.label}
              >
                <IconComponent className="h-5 w-5" />
              </Button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
