"use client"

import React, { useState } from "react"
import { Play, Layers, Zap, Settings, ChevronDown, ChevronUp, Check } from "lucide-react"

// 导入 UI 组件
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { LoadingSpinner } from "@/components/loading-spinner"

// 导入类型定义
import type { Organization } from "@/types/organization.types"
import type { ScanEngine } from "@/types/engine.types"

// 导入扫描服务和Toast
import { initiateScan } from "@/services/scan.service"
import { toast } from "sonner"

// 导入引擎 hooks
import { useEngines } from "@/hooks/use-engines"

// 组件属性类型定义
interface InitiateScanDialogProps {
  organization?: Organization | null  // 选中的组织（可选，用于显示信息）
  organizationId?: number             // 组织ID（用于发起扫描）
  targetId?: number                   // 目标ID（用于发起扫描，与organizationId二选一）
  targetName?: string                 // 目标名称（可选，如果提供则显示为目标扫描）
  open: boolean                       // 对话框开关状态
  onOpenChange: (open: boolean) => void  // 对话框开关回调
  onSuccess?: () => void              // 扫描发起成功的回调
}

/**
 * 发起扫描对话框组件
 * 
 * 功能特性：
 * 1. 选择扫描引擎
 * 2. 展示引擎详细信息
 * 3. 发起扫描操作
 */
export function InitiateScanDialog({
  organization,
  organizationId,
  targetId,
  targetName,
  open,
  onOpenChange,
  onSuccess,
}: InitiateScanDialogProps) {
  const [selectedEngineId, setSelectedEngineId] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedEngineId, setExpandedEngineId] = useState<string | null>(null)

  // 从后端获取引擎列表
  const { data: engines, isLoading, error } = useEngines()

  // 解析 YAML 配置以获取引擎的能力信息
  const parseEngineCapabilities = (configuration: string): string[] => {
    if (!configuration) return []
    
    try {
      // 简单的文本解析，查找 YAML 配置中的扫描阶段
      const capabilities: string[] = []
      
      // 查找是否启用了不同的扫描功能
      if (configuration.includes('subdomain_discovery')) capabilities.push('Subdomain Discovery')
      if (configuration.includes('port_scan')) capabilities.push('Port Scan')
      if (configuration.includes('waf_detection')) capabilities.push('WAF Detection')
      if (configuration.includes('screenshot')) capabilities.push('Screenshot')
      if (configuration.includes('osint')) capabilities.push('OSINT')
      if (configuration.includes('dir_file_fuzz')) capabilities.push('Directory and Files Search')
      if (configuration.includes('fetch_url')) capabilities.push('Fetch Endpoints(URLs)')
      if (configuration.includes('vulnerability_scan')) capabilities.push('Vulnerability Scan')
      
      return capabilities
    } catch (e) {
      console.error('解析引擎配置失败:', e)
      return []
    }
  }

  // 切换展开/收起
  const toggleExpand = (engineId: string) => {
    setExpandedEngineId(
      expandedEngineId === engineId ? null : engineId
    )
  }

  // 处理发起扫描
  const handleInitiate = async () => {
    if (!selectedEngineId) return
    
    // 验证必须有 organizationId 或 targetId
    if (!organizationId && !targetId) {
      toast.error("参数错误", {
        description: "必须提供组织ID或目标ID",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // 调用 API 发起扫描
      const response = await initiateScan({
        organizationId,
        targetId,
        engineId: Number(selectedEngineId),
      })
      
      // 显示成功消息
      toast.success("扫描已发起", {
        description: response.message || `成功创建 ${response.count} 个扫描任务`,
      })

      // 调用成功回调
      if (onSuccess) {
        onSuccess()
      }

      // 关闭对话框
      onOpenChange(false)
      
      // 重置选择
      setSelectedEngineId("")
    } catch (error) {
      console.error("Failed to initiate scan:", error)
      toast.error("发起扫描失败", {
        description: error instanceof Error ? error.message : "未知错误",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 处理对话框关闭
  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen)
      if (!newOpen) {
        // 关闭时重置所有状态
        setSelectedEngineId("")
        setExpandedEngineId(null)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            发起扫描
          </DialogTitle>
          <DialogDescription>
            {targetName ? (
              <>为目标 <span className="font-semibold text-foreground">{targetName}</span> 选择扫描引擎并开始安全扫描</>
            ) : (
              <>为组织 <span className="font-semibold text-foreground">{organization?.name}</span> 选择扫描引擎并开始安全扫描</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* 引擎列表容器 - 固定最大高度，预留滚动条空间 */}
          <div className="max-h-[500px] overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
                <span className="ml-2 text-sm text-muted-foreground">
                  加载引擎中...
                </span>
              </div>
            ) : error ? (
              <div className="py-8 text-center">
                <p className="text-sm text-destructive mb-2">加载引擎失败</p>
                <p className="text-xs text-muted-foreground">
                  {error instanceof Error ? error.message : '未知错误'}
                </p>
              </div>
            ) : !engines || engines.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                暂无可用引擎
              </div>
            ) : (
              <RadioGroup
                value={selectedEngineId}
                onValueChange={(value) => {
                  setSelectedEngineId(value)
                  // 选中时自动展开该引擎详情
                  setExpandedEngineId(value)
                }}
                disabled={isSubmitting}
                className="space-y-2"
              >
                {engines.map((engine) => {
                  const capabilities = parseEngineCapabilities(engine.configuration || '')
                  
                  return (
                    <Collapsible
                      key={engine.id}
                      open={expandedEngineId === engine.id.toString()}
                      onOpenChange={() => toggleExpand(engine.id.toString())}
                    >
                      <div
                        className={`rounded-lg border transition-all ${
                          selectedEngineId === engine.id.toString()
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/50"
                        }`}
                      >
                        {/* 引擎主信息 */}
                        <div className="flex items-center gap-3 p-4">
                          {/* Radio 按钮 */}
                          <RadioGroupItem
                            value={engine.id.toString()}
                            id={`engine-${engine.id}`}
                            className="mt-0.5"
                          />
                          
                          {/* 引擎名称和标签 */}
                          <label
                            htmlFor={`engine-${engine.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{engine.name}</span>
                              {engine.is_default && (
                                <Badge variant="secondary" className="text-xs">
                                  Default Engine
                                </Badge>
                              )}
                            </div>
                          </label>
                          
                          {/* 展开按钮 */}
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              {expandedEngineId === engine.id.toString() ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </div>

                        {/* 可展开的详情内容 */}
                        <CollapsibleContent>
                          <div className="border-t px-4 py-4">
                            {/* Engine Capabilities 标题 */}
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">
                              Engine Capabilities
                            </h4>
                            
                            {/* 能力列表 */}
                            {capabilities.length > 0 ? (
                              <div className="space-y-2">
                                {capabilities.map((capability, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-2 text-sm text-muted-foreground"
                                  >
                                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    <span>{capability}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                暂无能力信息
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )
                })}
              </RadioGroup>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleInitiate}
            disabled={!selectedEngineId || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner />
                发起扫描中...
              </>
            ) : (
              <>
                <Play />
                开始扫描
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
