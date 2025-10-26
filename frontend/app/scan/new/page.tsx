"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IconRadar, IconChevronRight, IconChevronLeft, IconSearch, IconCheck, IconSettings, IconTarget, IconEye, IconRocket } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useOrganizations } from "@/hooks/use-organizations"
import type { Organization } from "@/types/organization.types"
import { StepIndicator } from "@/components/scan/new/step-indicator"
import { OrganizationSelectionTable } from "@/components/scan/new/organization-selection-table"
import { TargetConfirmation } from "@/components/scan/new/target-confirmation"
import { ScanConfigForm } from "@/components/scan/new/scan-config-form"
import { ScanConfirmation } from "@/components/scan/new/scan-confirmation"

// 步骤定义
const STEPS = [
  { id: 1, title: "扫描策略", icon: IconSettings, description: "配置扫描参数" },
  { id: 2, title: "选择目标", icon: IconTarget, description: "选择扫描组织" },
  { id: 3, title: "确认目标", icon: IconEye, description: "查看并确认" },
  { id: 4, title: "确认启动", icon: IconRocket, description: "准备就绪" },
]

/**
 * 新建扫描页面
 * 多步骤流程创建扫描任务
 */
export default function NewScanPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  
  // 扫描配置状态
  const [selectedOrganizations, setSelectedOrganizations] = useState<Organization[]>([])
  const [scanName, setScanName] = useState("")
  const [scanType, setScanType] = useState("")
  const [description, setDescription] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  
  // 分页状态
  const [pagination, setPagination] = useState({
    pageIndex: 0,  // 0-based for react-table
    pageSize: 10,
  })
  
  // 获取组织列表（使用与组织管理页面相同的 API）
  const {
    data: organizationsData,
    isLoading,
  } = useOrganizations({
    page: pagination.pageIndex + 1, // 转换为 1-based
    pageSize: pagination.pageSize,
  })
  
  const organizations = organizationsData?.organizations || []
  const totalCount = organizationsData?.pagination?.total || 0
  const totalPages = organizationsData?.pagination?.totalPages || 0

  // 上一步
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // 下一步
  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  // 提交扫描任务
  const handleSubmit = () => {
    // TODO: 调用 API 创建扫描任务
    console.log({
      organizationIds: selectedOrganizations.map(org => org.id),
      organizations: selectedOrganizations.map(org => org.name),
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
        return scanName.trim() !== "" && scanType !== "" // 扫描策略
      case 2:
        return selectedOrganizations.length > 0 // 选择目标
      case 3:
        return true // 确认目标，仅查看，可直接下一步
      case 4:
        return true
      default:
        return false
    }
  }

  const currentStepData = STEPS[currentStep - 1]
  const StepIcon = currentStepData.icon

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6 px-4 lg:px-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
          <IconRadar className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">新建扫描任务</h1>
          <p className="text-muted-foreground">按照步骤配置并启动安全扫描</p>
        </div>
      </div>

      {/* 步骤指示器 */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* 主内容卡片 */}
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <StepIcon className="size-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
              <CardDescription>{currentStepData.description}</CardDescription>
            </div>
            {/* 右侧：搜索框（仅步骤2显示） */}
            {currentStep === 2 && (
              <div className="relative w-full max-w-sm">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="搜索组织..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}
          </div>
          {/* 已选择提示（仅步骤2且已选择时显示） */}
          {currentStep === 2 && selectedOrganizations.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg mt-4">
              <IconCheck className="size-4 text-primary flex-shrink-0" />
              <span className="text-sm">
                已选择 <span className="font-semibold">{selectedOrganizations.length}</span> 个组织
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 步骤内容 */}
          <div>
            {/* 步骤 1: 扫描策略 */}
            {currentStep === 1 && (
              <ScanConfigForm
                scanName={scanName}
                scanType={scanType}
                description={description}
                onScanNameChange={setScanName}
                onScanTypeChange={setScanType}
                onDescriptionChange={setDescription}
              />
            )}

            {/* 步骤 2: 选择目标 */}
            {currentStep === 2 && (
              <OrganizationSelectionTable
                organizations={organizations}
                selectedOrganizations={selectedOrganizations}
                onSelectionChange={setSelectedOrganizations}
                isLoading={isLoading}
                searchQuery={searchQuery}
                pagination={pagination}
                onPaginationChange={setPagination}
                totalCount={totalCount}
                totalPages={totalPages}
              />
            )}

            {/* 步骤 3: 确认目标 */}
            {currentStep === 3 && (
              <TargetConfirmation organizations={selectedOrganizations} />
            )}

            {/* 步骤 4: 确认启动 */}
            {currentStep === 4 && (
              <ScanConfirmation
                organizations={selectedOrganizations}
                scanName={scanName}
                scanType={scanType}
                description={description}
              />
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              第 {currentStep} 步，共 {STEPS.length} 步
            </div>
            <div className="flex items-center gap-2">
              {/* 上一步按钮 */}
              {currentStep > 1 && (
                <Button variant="outline" onClick={handlePrevious}>
                  <IconChevronLeft />
                  上一步
                </Button>
              )}
              
              {/* 下一步/启动扫描按钮 */}
              {currentStep < STEPS.length ? (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  下一步
                  <IconChevronRight />
                </Button>
              ) : (
                <Button onClick={handleSubmit} className="gap-2">
                  <IconRocket className="size-4" />
                  启动扫描
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
