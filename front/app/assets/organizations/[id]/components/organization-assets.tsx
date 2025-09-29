"use client"

// React 核心库
import { useState, useEffect } from "react"

// 第三方库和 API 客户端
import { getErrorMessage } from "@/lib/api-client"
import { OrganizationService } from "@/services/organization.service"

// UI 图标库
import { Globe, Loader2, Plus, Trash2 } from "lucide-react"

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
import { AddDomainDialog } from "@/app/assets/organizations/[id]/components/add-domain-dialog"

// 类型定义
interface Domain {
  id: string
  name: string
  domainName: string  // 前端使用 camelCase
  createdAt: string   // 前端使用 camelCase
  inputType: string
  h1TeamHandle?: string
  description?: string
  cidrRange?: string
}

interface OrganizationAssetsProps {
  organizationId: string
}

export default function OrganizationAssets({ organizationId }: OrganizationAssetsProps) {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(false)
  const [isAddDomainDialogOpen, setIsAddDomainDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [domainToDelete, setDomainToDelete] = useState<Domain | null>(null)

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

  // 获取组织关联的域名
  const fetchDomains = async () => {
    if (!organizationId) return

    try {
      setLoading(true)

      // 使用组织服务
      const response = await OrganizationService.getOrganizationDomains(organizationId)

      if (response.code === "200" && response.data && Array.isArray(response.data.domains)) {
        // 后端返回的是 domains 字段
        setDomains(response.data.domains)
      } else {
        console.error("获取域名失败:", response.message)
        setDomains([])
      }
    } catch (error) {
      console.error("获取域名出错:", error)
      console.error("操作失败:", getErrorMessage(error))
      setDomains([])
    } finally {
      setLoading(false)
    }
  }

  // 添加域名到组织
  const handleAddDomains = async (domains: string[]) => {
    if (!domains.length) return

    try {
      // 使用组织服务
      const response = await OrganizationService.createDomains({
        domains: domains.map(domain => ({ name: domain })),  // 转换为后端期望的格式
        organizationId: parseInt(organizationId),  // 转换为数字类型
      })

      if (response.code === "200") {
        const successCount = response.data?.successCount || domains.length
        console.log(`成功添加 ${successCount} 个域名`)
        // 重新获取域名列表
        fetchDomains()
      } else {
        throw new Error(response.message || "添加域名失败")
      }
    } catch (error: any) {
      console.error("添加域名失败:", error)
      console.error("操作失败:", getErrorMessage(error))
    } finally {
      setIsAddDomainDialogOpen(false)
    }
  }

  // 处理删除域名
  const handleDeleteDomain = (domain: Domain) => {
    setDomainToDelete(domain)
    setIsDeleteDialogOpen(true)
  }

  // 确认删除域名
  const confirmDeleteDomain = async () => {
    if (!domainToDelete) return

    try {
      // 使用组织服务
      const response = await OrganizationService.removeDomainFromOrganization({
        organizationId: parseInt(organizationId),
        domainId: parseInt(domainToDelete.id)
      })

      if (response.code === "200") {
        // 从本地状态中移除该域名
        setDomains(prev => prev.filter(domain => domain.id !== domainToDelete.id))
        console.log(`已解除组织与域名 "${domainToDelete.name || domainToDelete.domainName}" 的关联`)
      } else {
        throw new Error(response.message || "解除关联失败")
      }
    } catch (error: any) {
      console.error("解除域名关联失败:", error)
      console.error("操作失败:", getErrorMessage(error))
    } finally {
      setIsDeleteDialogOpen(false)
      setDomainToDelete(null)
    }
  }

  // 组件挂载或组织ID变化时获取域名
  useEffect(() => {
    fetchDomains()
  }, [organizationId])

  return (
    <div className="space-y-6">

      {/* 资产概览卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              域名资产
            </CardTitle>
            <Button
              onClick={() => setIsAddDomainDialogOpen(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加域名
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>正在加载域名资产...</span>
            </div>
          ) : domains.length > 0 ? (
            <div className="grid gap-4">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium">
                        {domain.name || domain.domainName}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {domain.inputType || 'domain'}
                      </Badge>
                    </div>
                    {domain.description && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {domain.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>创建时间: {formatDate(domain.createdAt)}</span>
                      {domain.h1TeamHandle && (
                        <span>H1 Team: {domain.h1TeamHandle}</span>
                      )}
                      {domain.cidrRange && (
                        <span>CIDR: {domain.cidrRange}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDomain(domain)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无域名资产</p>
              <p className="text-sm mt-1">点击上方按钮添加组织的第一个域名资产</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加域名对话框 */}
        <AddDomainDialog
        isOpen={isAddDomainDialogOpen}
        onClose={() => setIsAddDomainDialogOpen(false)}
        organizationName="当前组织"
        onAddDomain={handleAddDomains}
      />

      {/* 删除域名确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除域名</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除域名 "{domainToDelete?.name || domainToDelete?.domainName}" 吗？
              此操作将从当前组织中移除该域名，但不会删除域名本身的数据记录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDomain}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
