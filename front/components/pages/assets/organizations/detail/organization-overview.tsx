"use client"

// React 核心库
import { useState, useEffect } from "react"

// 第三方库和 API 客户端
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api-client"
import { OrganizationService } from "@/services/organization.service"

// UI 图标库
import { Building2, Loader2, X } from "lucide-react"

// UI 组件库
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// 业务组件
import { AddMainDomainDialog } from "@/components/pages/assets/organizations/detail/add-main-domain-dialog"

// 类型定义
interface MainDomain {
  id: string
  name: string
  mainDomainName: string  // 前端使用 camelCase
  createdAt: string       // 前端使用 camelCase
}

interface Organization {
  id: string
  name: string
  description: string
  createdAt: string       // 前端使用 camelCase
  domainCount: number     // 前端使用 camelCase
  status: string
  mainDomain?: string     // 前端使用 camelCase
}

interface OrganizationOverviewProps {
  organization: Organization
}



export default function OrganizationOverview({ organization: initialOrganization }: OrganizationOverviewProps) {
  const [isAddDomainDialogOpen, setIsAddDomainDialogOpen] = useState(false)
  const [organization, setOrganization] = useState(initialOrganization)
  const [mainDomains, setMainDomains] = useState<MainDomain[]>([])
  const [loadingMainDomains, setLoadingMainDomains] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [domainToDelete, setDomainToDelete] = useState<MainDomain | null>(null)

  // 辅助函数
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  // 获取组织关联的主域名
  const fetchMainDomains = async () => {
    if (!organization.id) return

    try {
      setLoadingMainDomains(true)

      // 使用组织服务
      const response = await OrganizationService.getOrganizationMainDomains(organization.id)

      if (response.code === "SUCCESS" && response.data && Array.isArray(response.data.mainDomains)) {
        // 数据已经自动转换为 camelCase，无需手动转换
        setMainDomains(response.data.mainDomains)
      } else {
        console.error("获取主域名失败:", response.message)
        setMainDomains([])
      }
    } catch (error) {
      console.error("获取主域名出错:", error)
      toast.error(getErrorMessage(error))
      setMainDomains([])
    } finally {
      setLoadingMainDomains(false)
    }
  }

  // 添加主域名到组织
  const handleAddMainDomains = async (domains: string[]) => {
    if (!domains.length) return

    try {
      // 使用组织服务
      const response = await OrganizationService.createMainDomains({
        mainDomains: domains,        // 前端使用 camelCase，会自动转换为 main_domains
        organizationId: organization.id,  // 前端使用 camelCase，会自动转换为 organization_id
      })

      if (response.code === "SUCCESS") {
        const successCount = response.data?.successCount || domains.length
        toast.success(`成功添加 ${successCount} 个主域名`)
        // 重新获取主域名列表
        fetchMainDomains()
      } else {
        throw new Error(response.message || "添加主域名失败")
      }
    } catch (error: any) {
      console.error("添加主域名失败:", error)
      toast.error(getErrorMessage(error))
    } finally {
      setIsAddDomainDialogOpen(false)
    }
  }

  // 处理删除主域名
  const handleDeleteDomain = (domain: MainDomain) => {
    setDomainToDelete(domain)
    setIsDeleteDialogOpen(true)
  }

  // 确认删除主域名
  const confirmDeleteDomain = async () => {
    if (!domainToDelete) return

    try {
      // 使用组织服务
      const response = await OrganizationService.removeMainDomainFromOrganization({
        organizationId: organization.id,
        mainDomainId: domainToDelete.id
      })

      if (response.code === "SUCCESS") {
        // 从本地状态中移除该域名
        setMainDomains(prev => prev.filter(domain => domain.id !== domainToDelete.id))
        toast.success(`已解除组织与主域名 "${domainToDelete.name || domainToDelete.mainDomainName}" 的关联`)
      } else {
        throw new Error(response.message || "解除关联失败")
      }
    } catch (error: any) {
      console.error("解除主域名关联失败:", error)
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleteDialogOpen(false)
      setDomainToDelete(null)
    }
  }

  // 组件挂载或组织ID变化时获取主域名
  useEffect(() => {
    fetchMainDomains()
  }, [organization.id])

  return (
    <div className="space-y-6">

      {/* 基本信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">组织名称</label>
              <p className="mt-1 text-sm"><span>{organization.name}</span></p>
            </div>
            <div className="md:col-span-1 lg:col-span-1">
              <label className="text-sm font-medium text-muted-foreground">组织描述</label>
              <p className="mt-1 text-sm text-muted-foreground">{organization.description}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">添加日期</label>
              <p className="mt-1 text-sm">{formatDate(organization.createdAt)}</p>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="text-sm font-medium text-muted-foreground">关联主域名</label>
              <div className="mt-1">
                {loadingMainDomains ? (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    加载中...
                  </div>
                ) : (
                  <div className="flex items-center flex-wrap">
                    {mainDomains.length > 0 ? (
                      <>
                        {mainDomains.map((domain) => (
                          <div key={domain.id} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground relative group mr-2 mb-2">
                            <span className="group-hover:opacity-0 transition-opacity duration-300">{domain.name || domain.mainDomainName}</span>
                            <div 
                              className="absolute inset-0 rounded-full flex items-center justify-center bg-secondary/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                              onClick={() => handleDeleteDomain(domain)}
                            >
                              <X className="h-3 w-3 text-gray-700 hover:text-red-500" />
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground mr-2">暂无主域名</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mb-2"
                      onClick={() => setIsAddDomainDialogOpen(true)}
                    >
                      添加主域名
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 添加主域名对话框 */}
      <AddMainDomainDialog
        isOpen={isAddDomainDialogOpen}
        onClose={() => setIsAddDomainDialogOpen(false)}
        organizationName={organization.name}
        onAddDomain={handleAddMainDomains}
      />

      {/* 删除主域名确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认解除关联</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要解除组织 "{organization.name}" 与主域名 "{domainToDelete?.name || domainToDelete?.mainDomainName}" 的关联吗？此操作不会删除主域名本身，只会解除与当前组织的关联关系。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDomain}>确认解除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 
