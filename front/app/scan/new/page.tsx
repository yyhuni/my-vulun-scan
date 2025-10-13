"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  IconRadar, 
  IconPlus, 
  IconTrash, 
  IconChevronRight,
  IconChevronLeft,
  IconCheck,
  IconBuilding,
  IconSearch,
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useOrganizations } from "@/hooks/use-organizations"
import type { Organization } from "@/types/organization.types"
import { cn } from "@/lib/utils"

// 步骤定义
const STEPS = [
  { id: 1, title: "选择目标", description: "选择扫描的组织" },
  { id: 2, title: "扫描配置", description: "配置扫描参数" },
  { id: 3, title: "确认启动", description: "确认并启动扫描" },
]

/**
 * 新建扫描页面
 * 多步骤流程创建扫描任务
 */
export default function NewScanPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  
  // 扫描配置状态
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [scanName, setScanName] = useState("")
  const [scanType, setScanType] = useState("")
  const [description, setDescription] = useState("")
  
  // 获取组织列表
  const { data: organizationsData, isLoading } = useOrganizations({
    page: 1,
    pageSize: 100,
  })
  
  const organizations = organizationsData?.organizations || []

  // 下一步
  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  // 上一步
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // 提交扫描任务
  const handleSubmit = () => {
    // TODO: 调用 API 创建扫描任务
    console.log({
      organizationId: selectedOrganization?.id,
      organizationName: selectedOrganization?.name,
      scanName,
      scanType,
      description,
    })
    // 提交成功后跳转到扫描历史页面
    router.push("/scan/history")
  }

  // 检查当前步骤是否可以继续
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedOrganization !== null
      case 2:
        return scanName.trim() !== "" && scanType !== ""
      case 3:
        return true
      default:
        return false
    }
  }

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        {/* 页面标题 */}
        <div className="flex items-center gap-3 mb-6">
          <IconRadar className="size-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">新建扫描</h1>
            <p className="text-muted-foreground">按照步骤配置并启动新的安全扫描任务</p>
          </div>
        </div>

        {/* 步骤指示器 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                      currentStep > step.id
                        ? "bg-primary border-primary text-primary-foreground"
                        : currentStep === step.id
                        ? "border-primary text-primary"
                        : "border-muted text-muted-foreground"
                    )}
                  >
                    {currentStep > step.id ? (
                      <IconCheck className="size-5" />
                    ) : (
                      <span className="font-semibold">{step.id}</span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={cn(
                      "text-sm font-medium",
                      currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 -mt-10 transition-colors",
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 步骤内容 */}
        <Card>
          <CardContent className="pt-6">
            {/* 步骤 1: 选择组织 */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">选择扫描目标组织</h3>
                  <p className="text-sm text-muted-foreground">
                    请选择一个组织作为扫描目标，系统将扫描该组织下的所有资产
                  </p>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">加载组织列表...</p>
                    </div>
                  </div>
                ) : organizations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <IconBuilding className="size-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground mb-4">暂无组织</p>
                    <Button variant="outline" onClick={() => router.push("/assets/organization")}>
                      前往创建组织
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {organizations.map((org) => (
                      <Card
                        key={org.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          selectedOrganization?.id === org.id
                            ? "border-primary ring-2 ring-primary ring-offset-2"
                            : "hover:border-primary/50"
                        )}
                        onClick={() => setSelectedOrganization(org)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <IconBuilding className="size-8 text-primary" />
                            {selectedOrganization?.id === org.id && (
                              <div className="bg-primary text-primary-foreground rounded-full p-1">
                                <IconCheck className="size-4" />
                              </div>
                            )}
                          </div>
                          <CardTitle className="text-base mt-2">{org.name}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {org.description || "无描述"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary">
                              {org.domains?.length || 0} 个域名
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 步骤 2: 扫描配置 */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">配置扫描参数</h3>
                  <p className="text-sm text-muted-foreground">
                    设置扫描任务的名称、类型和其他参数
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="scanName">扫描名称 *</Label>
                      <Input
                        id="scanName"
                        placeholder="例如：生产环境安全扫描"
                        value={scanName}
                        onChange={(e) => setScanName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scanType">扫描类型 *</Label>
                      <Select value={scanType} onValueChange={setScanType}>
                        <SelectTrigger id="scanType">
                          <SelectValue placeholder="选择扫描类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">全面扫描</SelectItem>
                          <SelectItem value="quick">快速扫描</SelectItem>
                          <SelectItem value="custom">自定义扫描</SelectItem>
                          <SelectItem value="vulnerability">漏洞扫描</SelectItem>
                          <SelectItem value="port">端口扫描</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">描述</Label>
                    <Textarea
                      id="description"
                      placeholder="扫描任务的详细描述..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={6}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 步骤 3: 确认信息 */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">确认扫描信息</h3>
                  <p className="text-sm text-muted-foreground">
                    请确认以下信息无误后启动扫描
                  </p>
                </div>

                <div className="space-y-4">
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-sm text-muted-foreground">扫描目标</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <IconBuilding className="size-8 text-primary" />
                        <div>
                          <div className="font-semibold">{selectedOrganization?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {selectedOrganization?.description}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-sm text-muted-foreground">扫描配置</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">扫描名称</span>
                        <span className="font-medium">{scanName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">扫描类型</span>
                        <Badge variant="secondary">
                          {scanType === "full" && "全面扫描"}
                          {scanType === "quick" && "快速扫描"}
                          {scanType === "custom" && "自定义扫描"}
                          {scanType === "vulnerability" && "漏洞扫描"}
                          {scanType === "port" && "端口扫描"}
                        </Badge>
                      </div>
                      {description && (
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">描述</div>
                          <div className="text-sm">{description}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep === 1) {
                router.back()
              } else {
                handlePrevious()
              }
            }}
          >
            <IconChevronLeft className="size-4 mr-2" />
            {currentStep === 1 ? "取消" : "上一步"}
          </Button>

          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              下一步
              <IconChevronRight className="size-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              <IconRadar className="size-4 mr-2" />
              启动扫描
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
