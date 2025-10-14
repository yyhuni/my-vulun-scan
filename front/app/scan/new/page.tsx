"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { IconRadar, IconChevronRight, IconChevronLeft, IconSearch, IconCheck } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useOrganizations } from "@/hooks/use-organizations"
import type { Organization } from "@/types/organization.types"
import { StepIndicator, type Step } from "@/components/scan/new/step-indicator"
import { OrganizationSelectionTable } from "@/components/scan/new/organization-selection-table"
import { ScanConfigForm } from "@/components/scan/new/scan-config-form"
import { ScanConfirmation } from "@/components/scan/new/scan-confirmation"

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
    error,
  } = useOrganizations({
    page: pagination.pageIndex + 1, // 转换为 1-based
    pageSize: pagination.pageSize,
    sortBy: "updated_at",
    sortOrder: "desc"
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
        return selectedOrganizations.length > 0
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
        <StepIndicator steps={STEPS} currentStep={currentStep} />

        {/* 分隔线 */}
        <div className="border-t" />

        {/* 操作栏 */}
        <div className="flex items-center gap-4 py-4">
          {/* 左侧：搜索框（仅步骤1显示） */}
          {currentStep === 1 && (
            <div className="relative flex-1 max-w-md">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="搜索组织名称或描述..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* 中间：已选择提示（仅步骤1且已选择时显示） */}
          {currentStep === 1 && selectedOrganizations.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-md">
              <IconCheck className="size-4 text-primary flex-shrink-0" />
              <span className="text-sm whitespace-nowrap">
                已选择: <span className="font-medium">{selectedOrganizations.length} 个组织</span>
              </span>
            </div>
          )}

          {/* 右侧：操作按钮 */}
          <div className="ml-auto flex items-center gap-2">
            {/* 上一步按钮（步骤2和3显示） */}
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
              <Button onClick={handleSubmit}>
                <IconRadar />
                启动扫描
              </Button>
            )}
          </div>
        </div>

        {/* 步骤内容 */}
        <div className="pt-4 pb-6">
          {/* 步骤 1: 选择组织 */}
          {currentStep === 1 && (
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

          {/* 步骤 2: 扫描配置 */}
          {currentStep === 2 && (
            <ScanConfigForm
              scanName={scanName}
              scanType={scanType}
              description={description}
              onScanNameChange={setScanName}
              onScanTypeChange={setScanType}
              onDescriptionChange={setDescription}
            />
          )}

          {/* 步骤 3: 确认信息 */}
          {currentStep === 3 && (
            <ScanConfirmation
              organizations={selectedOrganizations}
              scanName={scanName}
              scanType={scanType}
              description={description}
            />
          )}
        </div>
      </div>
    </div>
  )
}
