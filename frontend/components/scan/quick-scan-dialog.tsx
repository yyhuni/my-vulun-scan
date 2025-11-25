"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Zap, Target, Settings, Check, ChevronRight, ChevronLeft, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { getEngines } from "@/services/engine.service"
import { initiateScan } from "@/services/scan.service"
import type { ScanEngine } from "@/types/engine.types"

// 步骤定义
const STEPS = [
  { id: 1, title: "输入目标", icon: Target },
  { id: 2, title: "选择引擎", icon: Settings },
  { id: 3, title: "确认", icon: Check },
] as const

interface QuickScanDialogProps {
  trigger?: React.ReactNode
}

export function QuickScanDialog({ trigger }: QuickScanDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  // 表单数据
  const [targetInput, setTargetInput] = React.useState("")
  const [selectedEngineId, setSelectedEngineId] = React.useState<string>("")
  const [expandedEngineId, setExpandedEngineId] = React.useState<string | null>(null)
  const [engines, setEngines] = React.useState<ScanEngine[]>([])
  
  // 解析目标列表（多行）
  const parseTargets = (input: string): string[] => {
    return input
      .split(/[\n,;]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0)
  }
  
  // 解析 YAML 配置以获取引擎的能力信息
  const parseEngineCapabilities = (configuration: string): string[] => {
    if (!configuration) return []
    try {
      const capabilities: string[] = []
      if (configuration.includes('subdomain_discovery')) capabilities.push('子域名发现')
      if (configuration.includes('port_scan')) capabilities.push('端口扫描')
      if (configuration.includes('waf_detection')) capabilities.push('WAF 检测')
      if (configuration.includes('screenshot')) capabilities.push('截图')
      if (configuration.includes('osint')) capabilities.push('OSINT')
      if (configuration.includes('dir_file_fuzz')) capabilities.push('目录文件扫描')
      if (configuration.includes('fetch_url')) capabilities.push('URL 采集')
      if (configuration.includes('vulnerability_scan')) capabilities.push('漏洞扫描')
      return capabilities
    } catch {
      return []
    }
  }
  
  // 加载引擎列表
  React.useEffect(() => {
    if (open && step === 2 && engines.length === 0) {
      setIsLoading(true)
      getEngines()
        .then((data) => {
          setEngines(data)
          // 自动选择默认引擎或第一个
          const defaultEngine = data.find(e => e.is_enabled)
          if (defaultEngine) {
            setSelectedEngineId(String(defaultEngine.id))
            setExpandedEngineId(String(defaultEngine.id))
          }
        })
        .catch(() => {
          toast.error("获取引擎列表失败")
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [open, step, engines.length])
  
  // 重置表单
  const resetForm = () => {
    setStep(1)
    setTargetInput("")
    setSelectedEngineId("")
    setExpandedEngineId(null)
  }
  
  // 关闭弹框
  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      resetForm()
    }
  }
  
  // 验证单个目标
  const validateSingleTarget = (target: string): boolean => {
    if (!target.trim()) return false
    const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/
    const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
    return domainPattern.test(target) || ipPattern.test(target) || cidrPattern.test(target)
  }
  
  // 验证所有目标
  const validateTargets = (): { valid: boolean; targets: string[]; invalid: string[] } => {
    const targets = parseTargets(targetInput)
    if (targets.length === 0) {
      return { valid: false, targets: [], invalid: [] }
    }
    const invalid = targets.filter(t => !validateSingleTarget(t))
    return { valid: invalid.length === 0, targets, invalid }
  }
  
  // 下一步
  const handleNext = () => {
    if (step === 1) {
      const { valid, targets, invalid } = validateTargets()
      if (targets.length === 0) {
        toast.error("请输入至少一个目标")
        return
      }
      if (!valid) {
        toast.error(`以下目标格式无效：${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? "..." : ""}`)
        return
      }
    }
    if (step === 2) {
      if (!selectedEngineId) {
        toast.error("请选择扫描引擎")
        return
      }
    }
    setStep(step + 1)
  }
  
  // 上一步
  const handlePrev = () => {
    setStep(step - 1)
  }
  
  // 提交扫描
  const handleSubmit = async () => {
    const targets = parseTargets(targetInput)
    if (targets.length === 0) return
    
    setIsSubmitting(true)
    try {
      // 逐个发起扫描任务
      let successCount = 0
      let failCount = 0
      
      for (const target of targets) {
        try {
          await initiateScan({
            targetName: target,
            engineId: Number(selectedEngineId),
          })
          successCount++
        } catch {
          failCount++
        }
      }
      
      if (successCount > 0) {
        toast.success(`已创建 ${successCount} 个扫描任务${failCount > 0 ? `，${failCount} 个失败` : ""}`)
        handleClose(false)
        router.push("/scan/history/")
      } else {
        toast.error("创建扫描任务失败")
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.response?.data?.error || "创建扫描任务失败")
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // 获取选中的引擎
  const selectedEngine = engines.find(e => String(e.id) === selectedEngineId)
  const parsedTargets = parseTargets(targetInput)
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-1.5">
            <Zap className="h-4 w-4" />
            快速扫描
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            快速扫描
          </DialogTitle>
        </DialogHeader>
        
        {/* 步骤指示器 */}
        <div className="flex items-center justify-between px-2 py-4">
          {STEPS.map((s, index) => (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    step === s.id && "border-primary bg-primary text-primary-foreground",
                    step > s.id && "border-primary bg-primary/10 text-primary",
                    step < s.id && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {step > s.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <s.icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    step >= s.id ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 rounded-full transition-colors",
                    step > s.id ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* 步骤内容 */}
        <div className="min-h-[200px] py-4">
          {/* 第一步：输入目标 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target">目标</Label>
                <Textarea
                  id="target"
                  placeholder="每行输入一个目标，支持域名、IP 或 CIDR&#10;example.com&#10;192.168.1.1&#10;10.0.0.0/24"
                  value={targetInput}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTargetInput(e.target.value)}
                  className="min-h-[120px] font-mono text-sm"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  每行一个目标，支持域名、IP 地址或 CIDR 范围
                  {parsedTargets.length > 0 && (
                    <span className="ml-2 text-primary">
                      已输入 {parsedTargets.length} 个目标
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
          
          {/* 第二步：选择引擎 */}
          {step === 2 && (
            <div className="space-y-2">
              <Label>扫描引擎</Label>
              <div className="max-h-[300px] overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : engines.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    暂无可用引擎
                  </div>
                ) : (
                  <RadioGroup
                    value={selectedEngineId}
                    onValueChange={(value: string) => {
                      setSelectedEngineId(value)
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
                          onOpenChange={() => setExpandedEngineId(
                            expandedEngineId === engine.id.toString() ? null : engine.id.toString()
                          )}
                        >
                          <div
                            className={cn(
                              "rounded-lg border transition-all",
                              selectedEngineId === engine.id.toString()
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/50"
                            )}
                          >
                            {/* 引擎主信息 */}
                            <div className="flex items-center gap-3 p-3">
                              <RadioGroupItem
                                value={engine.id.toString()}
                                id={`engine-${engine.id}`}
                                className="mt-0.5"
                              />
                              <label
                                htmlFor={`engine-${engine.id}`}
                                className="flex-1 cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{engine.name}</span>
                                  {engine.is_enabled && (
                                    <Badge variant="secondary" className="text-xs">
                                      已启用
                                    </Badge>
                                  )}
                                </div>
                              </label>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  {expandedEngineId === engine.id.toString() ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                            
                            {/* 可展开的详情 */}
                            <CollapsibleContent>
                              <div className="border-t px-3 py-3">
                                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                                  扫描能力
                                </h4>
                                {capabilities.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {capabilities.map((cap, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        <Check className="h-3 w-3 mr-1 text-green-500" />
                                        {cap}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground">暂无能力信息</p>
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
          )}
          
          {/* 第三步：确认 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">目标</span>
                  <div className="mt-1 max-h-[100px] overflow-y-auto">
                    {parsedTargets.map((target, idx) => (
                      <div key={idx} className="font-mono text-sm">{target}</div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">共 {parsedTargets.length} 个目标</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">引擎</span>
                  <Badge variant="secondary">{selectedEngine?.name}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                确认以上信息无误后，点击开始扫描
              </p>
            </div>
          )}
        </div>
        
        {/* 操作按钮 */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={step === 1}
            className={cn(step === 1 && "invisible")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            上一步
          </Button>
          
          {step < 3 ? (
            <Button onClick={handleNext}>
              下一步
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  开始扫描
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
