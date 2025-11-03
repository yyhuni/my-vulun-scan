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
import type { ScanStrategy } from "@/types/strategy.types"

// 组件属性类型定义
interface InitiateScanDialogProps {
  organization: Organization | null  // 选中的组织（可选，用于显示信息）
  targetName?: string                // 目标名称（可选，如果提供则显示为目标扫描）
  open: boolean                      // 对话框开关状态
  onOpenChange: (open: boolean) => void  // 对话框开关回调
  onInitiate?: (organizationId: number, strategyId: number) => void  // 发起扫描回调
}

/**
 * 发起扫描对话框组件
 * 
 * 功能特性：
 * 1. 选择扫描策略
 * 2. 展示策略详细信息
 * 3. 发起扫描操作
 */
export function InitiateScanDialog({
  organization,
  targetName,
  open,
  onOpenChange,
  onInitiate,
}: InitiateScanDialogProps) {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedStrategyId, setExpandedStrategyId] = useState<string | null>(null)

  // TODO: 使用 React Query 获取策略列表
  // const { data: strategies, isLoading } = useStrategies({ is_enabled: true })
  
  // 临时模拟数据（待实现 API 后删除）
  const mockStrategies: ScanStrategy[] = [
    {
      id: 1,
      name: "Full Scan",
      type: "comprehensive",
      description: "全面深度扫描，覆盖所有已知漏洞类型，耗时较长但最全面",
      tools: ["Nmap", "Masscan", "Nikto", "SQLMap", "XSStrike"],
      tool_ids: [1, 2, 3, 4, 5],
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      usage_count: 89,
      capabilities: [
        "Subdomain Discovery",
        "WAF Detection",
        "Screenshot",
        "OSINT",
        "Port Scan",
        "Directory and Files Search",
        "Fetch Endpoints(URLs)",
        "Vulnerability Scan",
      ],
    },
    {
      id: 2,
      name: "OSINT",
      type: "custom",
      description: "开源情报收集，通过公开渠道收集目标信息",
      tools: ["theHarvester", "Recon-ng", "Shodan"],
      tool_ids: [7, 8, 9],
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      usage_count: 156,
      capabilities: ["OSINT", "Subdomain Discovery"],
    },
    {
      id: 3,
      name: "Port Scan",
      type: "quick",
      description: "快速端口扫描，识别开放的服务和端口",
      tools: ["Nmap", "Masscan"],
      tool_ids: [1, 2],
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      usage_count: 234,
      capabilities: ["Port Scan"],
    },
    {
      id: 4,
      name: "Subdomain Scan",
      type: "custom",
      description: "子域名发现和枚举，找出所有相关子域名",
      tools: ["Subfinder", "Amass", "DNSrecon"],
      tool_ids: [10, 11, 12],
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      usage_count: 178,
      capabilities: ["Subdomain Discovery"],
    },
    {
      id: 5,
      name: "Vulnerability Scan",
      type: "custom",
      description: "Web 应用漏洞扫描，检测 SQL 注入、XSS 等常见漏洞",
      tools: ["Nikto", "SQLMap", "XSStrike", "Burp Suite"],
      tool_ids: [3, 4, 5, 6],
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      usage_count: 92,
      capabilities: ["Vulnerability Scan", "WAF Detection"],
    },
    {
      id: 6,
      name: "reNgine Recommended",
      type: "comprehensive",
      description: "reNgine 推荐配置，平衡速度和覆盖面的最佳实践",
      tools: ["Nmap", "Subfinder", "Nuclei", "httpx", "waybackurls"],
      tool_ids: [1, 10, 13, 14, 15],
      is_enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      usage_count: 456,
      capabilities: [
        "Subdomain Discovery",
        "Port Scan",
        "Screenshot",
        "Fetch Endpoints(URLs)",
        "Vulnerability Scan",
      ],
    },
  ]

  const strategies = mockStrategies
  const isLoading = false

  // 切换展开/收起
  const toggleExpand = (strategyId: string) => {
    setExpandedStrategyId(
      expandedStrategyId === strategyId ? null : strategyId
    )
  }

  // 处理发起扫描
  const handleInitiate = async () => {
    if (!organization || !selectedStrategyId) return

    setIsSubmitting(true)

    try {
      // TODO: 调用 API 发起扫描
      // await initiateScan(organization.id, Number(selectedStrategyId))
      
      // 临时模拟延迟
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 调用回调
      if (onInitiate) {
        onInitiate(organization.id, Number(selectedStrategyId))
      }

      // 关闭对话框
      onOpenChange(false)
      
      // 重置选择
      setSelectedStrategyId("")
    } catch (error) {
      console.error("Failed to initiate scan:", error)
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
        setSelectedStrategyId("")
        setExpandedStrategyId(null)
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
              <>为目标 <span className="font-semibold text-foreground">{targetName}</span> 选择扫描策略并开始安全扫描</>
            ) : (
              <>为组织 <span className="font-semibold text-foreground">{organization?.name}</span> 选择扫描策略并开始安全扫描</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* 策略列表容器 - 固定最大高度，预留滚动条空间 */}
          <div className="max-h-[500px] overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
                <span className="ml-2 text-sm text-muted-foreground">
                  加载策略中...
                </span>
              </div>
            ) : strategies.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                暂无可用策略
              </div>
            ) : (
              <RadioGroup
                value={selectedStrategyId}
                onValueChange={(value) => {
                  setSelectedStrategyId(value)
                  // 选中时自动展开该策略详情
                  setExpandedStrategyId(value)
                }}
                disabled={isSubmitting}
                className="space-y-2"
              >
                {strategies.map((strategy) => (
                  <Collapsible
                    key={strategy.id}
                    open={expandedStrategyId === strategy.id.toString()}
                    onOpenChange={() => toggleExpand(strategy.id.toString())}
                  >
                    <div
                      className={`rounded-lg border transition-all ${
                        selectedStrategyId === strategy.id.toString()
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      {/* 策略主信息 */}
                      <div className="flex items-center gap-3 p-4">
                        {/* Radio 按钮 */}
                        <RadioGroupItem
                          value={strategy.id.toString()}
                          id={`strategy-${strategy.id}`}
                          className="mt-0.5"
                        />
                        
                        {/* 策略名称和标签 */}
                        <label
                          htmlFor={`strategy-${strategy.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{strategy.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              Default Engine
                            </Badge>
                          </div>
                        </label>
                        
                        {/* 展开按钮 */}
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            {expandedStrategyId === strategy.id.toString() ? (
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
                          {strategy.capabilities && strategy.capabilities.length > 0 ? (
                            <div className="space-y-2">
                              {strategy.capabilities.map((capability, index) => (
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
                ))}
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
            disabled={!selectedStrategyId || isSubmitting}
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
