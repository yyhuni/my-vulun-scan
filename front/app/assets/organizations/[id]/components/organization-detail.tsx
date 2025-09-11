"use client"

// React 核心库
import { useState, useEffect } from "react"

// 第三方库和 API 客户端
import { getErrorMessage } from "@/lib/api-client"
import { OrganizationService } from "@/services/organization.service"

// UI 图标库
import { Building2, RefreshCw } from "lucide-react"

// UI 组件库
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// 自定义 Hooks
import { useToast } from "@/hooks/use-toast"

// 通用组件
import DataStateWrapper from "@/components/common/data-state-wrapper"

// 业务组件
import OrganizationOverview from "./organization-overview"
import OrganizationSubdomains from "./organization-subdomains"
import OrganizationVulnerabilities from "./organization-vulnerabilities"
import OrganizationScanHistory from "./organization-scan-history"


// 类型定义
interface Organization {
  id: string
  name: string
  description: string
  createdAt: string   // 前端使用 camelCase
  domainCount: number // 前端使用 camelCase
  status: string      // 添加状态字段
  mainDomain?: string // 前端使用 camelCase
}

interface OrganizationDetailProps {
  organizationId: string
}

type ViewState = "loading" | "data" | "error"





export default function OrganizationDetail({ organizationId }: OrganizationDetailProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [viewState, setViewState] = useState<ViewState>("loading")
  const [error, setError] = useState<string | null>(null)


  const { toast } = useToast()

  // 辅助函数

  useEffect(() => {
    fetchOrganization(organizationId)
  }, [organizationId])

  const fetchOrganization = async (id: string) => {
    try {
      setViewState("loading")
      setError(null)

      // 使用组织服务
      const response = await OrganizationService.getOrganization(id)

      // 检查响应码并获取数据
      if (response.code === "SUCCESS" && response.data) {
        // 数据已经自动转换为 camelCase，无需手动转换
        setOrganization(response.data)
        setViewState("data")
      } else {
        throw new Error("API 返回了无效的数据格式")
      }
    } catch (err: any) {
      console.error('Error fetching organization details:', err)
      setError(getErrorMessage(err))
      setViewState("error")
    }
  }


  

  const handleStartScan = async () => {
    setIsScanning(true)
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setIsScanning(false)
    toast({
      title: "扫描完成",
      description: "组织扫描已完成，发现3个新问题",
    })
  }

  // 组织详情内容组件
  const OrganizationDetailContent = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">概览</TabsTrigger>
        <TabsTrigger value="domains">子域名</TabsTrigger>
        <TabsTrigger value="vulnerabilities">漏洞</TabsTrigger>
        <TabsTrigger value="scan-history">扫描历史</TabsTrigger>
      </TabsList>

      {/* 概览标签页 */}
      <TabsContent value="overview" className="space-y-6">
        <OrganizationOverview
          organization={organization!}
        />
      </TabsContent>

      {/* 所有域名标签页 */}
      <TabsContent value="domains" className="space-y-6">
        <OrganizationSubdomains organizationId={organizationId} />
      </TabsContent>

      {/* 漏洞标签页 */}
      <TabsContent value="vulnerabilities" className="space-y-6">
        <OrganizationVulnerabilities organizationId={organizationId} />
      </TabsContent>

      {/* 扫描历史标签页 */}
      <TabsContent value="scan-history" className="space-y-6">
        <OrganizationScanHistory organizationId={organizationId} />
      </TabsContent>
    </Tabs>
  )

  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h1 className="text-3xl font-bold tracking-tight">{organization?.name || "加载中..."}</h1>
            {organization?.id && (
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground font-mono">
                {organization.id}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{organization?.description || "暂无描述"}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleStartScan} disabled={isScanning}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? "animate-spin" : ""}`} />
            {isScanning ? "扫描中..." : "开始扫描"}
          </Button>
        </div>
      </div>

      {/* 主要内容 */}
      <DataStateWrapper
        state={viewState}
        loadingText="正在加载组织详情..."
        errorStatusCode={404}
        errorTitle="加载失败"
        errorDescription={error || "获取组织详情时发生错误，请重试"}
        showRetry={true}
        onRetry={() => fetchOrganization(organizationId)}
        hasData={!!organization}
      >
        <OrganizationDetailContent />
      </DataStateWrapper>


    </div>
  )
} 
