"use client"

import React, { useState, useEffect } from "react"
import { Plus, Wrench, AlertTriangle } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/loading-spinner"
import { IconX } from "@tabler/icons-react"

// 导入 React Query Hook
import { useCreateTool, useCategories } from "@/hooks/use-tools"

// 导入类型定义
import type { Tool } from "@/types/tool.types"
import { CategoryNameMap } from "@/types/tool.types"

// 组件属性类型定义
interface AddToolDialogProps {
  onAdd?: (tool: Tool) => void  // 添加成功回调函数（可选）
  open?: boolean                // 外部控制对话框开关状态
  onOpenChange?: (open: boolean) => void  // 外部控制对话框开关回调
}

/**
 * 根据工具名称和安装命令自动生成版本查询命令
 */
function generateVersionCommand(toolName: string, installCommand: string): string {
  if (!toolName) return ""
  
  const lowerName = toolName.toLowerCase().trim()
  const lowerInstall = installCommand.toLowerCase()
  
  // Python 工具
  if (lowerInstall.includes("python") || lowerInstall.includes(".py")) {
    return `python ${lowerName}.py -v`
  }
  
  // Go 工具
  if (lowerInstall.includes("go install") || lowerInstall.includes("go get")) {
    return `${lowerName} -version`
  }
  
  // 默认尝试常见的版本命令
  return `${lowerName} --version`
}

/**
 * 添加工具对话框组件（使用 React Query）
 * 
 * 功能特性：
 * 1. 自动管理提交状态
 * 2. 自动错误处理和成功提示
 * 3. 自动刷新相关数据
 * 4. 支持多分类标签选择
 * 5. 支持安装、更新、版本命令配置
 */
export function AddToolDialog({ 
  onAdd, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange 
}: AddToolDialogProps) {
  // 对话框开关状态 - 支持外部控制
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  // 表单数据状态
  const [formData, setFormData] = useState({
    name: "",
    repoUrl: "",
    version: "",
    description: "",
    categoryNames: [] as string[],
    installCommand: "",
    updateCommand: "",
    versionCommand: "",
  })

  // 获取可用的分类列表
  const { data: availableCategories = [] } = useCategories()

  // 使用 React Query 的创建工具 mutation
  const createTool = useCreateTool()

  // 自动生成版本命令
  useEffect(() => {
    if (formData.name && formData.installCommand && !formData.versionCommand) {
      const generatedCmd = generateVersionCommand(formData.name, formData.installCommand)
      setFormData(prev => ({
        ...prev,
        versionCommand: generatedCmd
      }))
    }
  }, [formData.name, formData.installCommand])

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 表单验证
    if (!formData.name.trim() || !formData.installCommand.trim() || !formData.updateCommand.trim() || !formData.versionCommand.trim()) {
      return
    }

    if (formData.name.trim().length < 2 || formData.name.trim().length > 255) {
      return
    }

    // 使用 React Query mutation
    createTool.mutate(
      {
        name: formData.name.trim(),
        repoUrl: formData.repoUrl.trim() || undefined,
        version: formData.version.trim() || undefined,
        description: formData.description.trim() || undefined,
        categoryNames: formData.categoryNames.length > 0 ? formData.categoryNames : undefined,
        installCommand: formData.installCommand.trim(),
        updateCommand: formData.updateCommand.trim(),
        versionCommand: formData.versionCommand.trim(),
      },
      {
        onSuccess: (response) => {
          // 重置表单
          setFormData({
            name: "",
            repoUrl: "",
            version: "",
            description: "",
            categoryNames: [],
            installCommand: "",
            updateCommand: "",
            versionCommand: "",
          })
          
          // 关闭对话框
          setOpen(false)
          
          // 调用外部回调（如果提供）
          if (onAdd && response.state === 'success' && response.data?.tool) {
            onAdd(response.data.tool)
          }
        }
      }
    )
  }

  // 处理输入框变化
  const handleInputChange = (field: keyof typeof formData, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // 处理分类标签点击
  const handleCategoryToggle = (categoryName: string) => {
    setFormData((prev) => {
      const isSelected = prev.categoryNames.includes(categoryName)
      return {
        ...prev,
        categoryNames: isSelected
          ? prev.categoryNames.filter(c => c !== categoryName)
          : [...prev.categoryNames, categoryName]
      }
    })
  }

  // 移除分类标签
  const handleCategoryRemove = (categoryName: string) => {
    setFormData((prev) => ({
      ...prev,
      categoryNames: prev.categoryNames.filter(c => c !== categoryName)
    }))
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!createTool.isPending) {
      setOpen(newOpen)
      if (!newOpen) {
        // 关闭时重置表单
        setFormData({
          name: "",
          repoUrl: "",
          version: "",
          description: "",
          categoryNames: [],
          installCommand: "",
          updateCommand: "",
          versionCommand: "",
        })
      }
    }
  }

  // 表单验证
  const isFormValid = 
    formData.name.trim().length >= 2 && 
    formData.name.trim().length <= 255 &&
    formData.installCommand.trim().length > 0 &&
    formData.updateCommand.trim().length > 0 &&
    formData.versionCommand.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* 触发按钮 - 仅在非外部控制时显示 */}
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button>
            <Plus />
            Add new tool
          </Button>
        </DialogTrigger>
      )}
      
      {/* 对话框内容 */}
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wrench />
            <span>添加新工具</span>
          </DialogTitle>
          <DialogDescription>
            配置扫描工具的基本信息和执行命令。标有 * 的字段为必填项。
          </DialogDescription>
        </DialogHeader>
        
        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* 基本信息部分 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">基本信息</h3>
              
              {/* 工具名称 */}
              <div className="grid gap-2">
                <Label htmlFor="name">
                  工具名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="例如: Nuclei, Subfinder, HTTPX"
                  disabled={createTool.isPending}
                  maxLength={255}
                  required
                />
                <div className="text-xs text-muted-foreground">
                  {formData.name.length}/255 字符
                </div>
              </div>
              
              {/* 仓库地址 */}
              <div className="grid gap-2">
                <Label htmlFor="repoUrl">仓库地址</Label>
                <Input
                  id="repoUrl"
                  type="url"
                  value={formData.repoUrl}
                  onChange={(e) => handleInputChange("repoUrl", e.target.value)}
                  placeholder="https://github.com/projectdiscovery/nuclei"
                  disabled={createTool.isPending}
                  maxLength={512}
                />
              </div>

              {/* 版本号 */}
              <div className="grid gap-2">
                <Label htmlFor="version">当前版本</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => handleInputChange("version", e.target.value)}
                  placeholder="v3.0.0"
                  disabled={createTool.isPending}
                  maxLength={100}
                />
              </div>
              
              {/* 工具描述 */}
              <div className="grid gap-2">
                <Label htmlFor="description">工具描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="描述工具的功能、特点和使用场景..."
                  disabled={createTool.isPending}
                  rows={3}
                  maxLength={1000}
                />
                <div className="text-xs text-muted-foreground">
                  {formData.description.length}/1000 字符
                </div>
              </div>

              {/* 分类标签 */}
              <div className="grid gap-2">
                <Label>分类标签</Label>
                
                {/* 已选择的标签 */}
                {formData.categoryNames.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/50">
                    {formData.categoryNames.map((categoryName) => (
                      <Badge 
                        key={categoryName} 
                        variant="default"
                        className="flex items-center gap-1 px-2 py-1"
                      >
                        {CategoryNameMap[categoryName] || categoryName}
                        <button
                          type="button"
                          onClick={() => handleCategoryRemove(categoryName)}
                          disabled={createTool.isPending}
                          className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                        >
                          <IconX className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* 可选择的标签 */}
                <div className="flex flex-wrap gap-2 p-3 border rounded-md">
                  {availableCategories.length > 0 ? (
                    availableCategories.map((categoryName) => {
                      const isSelected = formData.categoryNames.includes(categoryName)
                      return (
                        <Badge 
                          key={categoryName}
                          variant={isSelected ? "secondary" : "outline"}
                          className="cursor-pointer hover:bg-secondary/80 transition-colors"
                          onClick={() => handleCategoryToggle(categoryName)}
                        >
                          {CategoryNameMap[categoryName] || categoryName}
                        </Badge>
                      )
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无可用分类</p>
                  )}
                </div>
              </div>
            </div>

            {/* 命令配置部分 */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">命令配置</h3>
              
  

              {/* 安装命令 */}
              <div className="grid gap-2">
                <Label htmlFor="installCommand">
                  安装命令 <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="installCommand"
                  value={formData.installCommand}
                  onChange={(e) => handleInputChange("installCommand", e.target.value)}
                  placeholder="git clone https://github.com/user/tool&#10;或&#10;go install -v github.com/tool@latest"
                  disabled={createTool.isPending}
                  rows={3}
                  required
                  className="font-mono text-sm"
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>示例：</strong></p>
                  <p>• 使用 git: <code className="bg-muted px-1 py-0.5 rounded">git clone https://github.com/user/tool</code></p>
                  <p>• 使用 go: <code className="bg-muted px-1 py-0.5 rounded">go install -v github.com/tool@latest</code></p>
                  <p className="text-amber-600">⚠️ 注意：go get 已不再支持，请使用 go install</p>
                </div>
              </div>

              {/* 更新命令 */}
              <div className="grid gap-2">
                <Label htmlFor="updateCommand">
                  更新命令 <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="updateCommand"
                  value={formData.updateCommand}
                  onChange={(e) => handleInputChange("updateCommand", e.target.value)}
                  placeholder="git pull&#10;或&#10;go install -v github.com/tool@latest"
                  disabled={createTool.isPending}
                  rows={2}
                  className="font-mono text-sm"
                  required
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• 使用 git clone 安装的工具，推荐使用 <code className="bg-muted px-1 py-0.5 rounded">git pull</code></p>
                  <p>• 使用 go install 安装的工具，推荐使用相同的安装命令</p>
                </div>
              </div>

              {/* 版本查询命令 */}
              <div className="grid gap-2">
                <Label htmlFor="versionCommand">
                  版本查询命令 <span className="text-destructive">*</span>
                  {formData.versionCommand && (
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      已自动生成
                    </span>
                  )}
                </Label>
                <Input
                  id="versionCommand"
                  value={formData.versionCommand}
                  onChange={(e) => handleInputChange("versionCommand", e.target.value)}
                  placeholder="toolname --version"
                  disabled={createTool.isPending}
                  maxLength={500}
                  className="font-mono text-sm"
                  required
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>系统会使用此命令检查工具版本并提示更新。常见格式：</p>
                  <p>• <code className="bg-muted px-1 py-0.5 rounded">toolname -v</code></p>
                  <p>• <code className="bg-muted px-1 py-0.5 rounded">toolname -V</code></p>
                  <p>• <code className="bg-muted px-1 py-0.5 rounded">toolname --version</code></p>
                  <p>• <code className="bg-muted px-1 py-0.5 rounded">python tool_name.py -v</code></p>
                </div>
              </div>
            </div>
          </div>
          
          {/* 对话框底部按钮 */}
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={createTool.isPending}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={createTool.isPending || !isFormValid}
            >
              {createTool.isPending ? (
                <>
                  <LoadingSpinner/>
                  创建中...
                </>
              ) : (
                <>
                  <Plus />
                  创建工具
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
