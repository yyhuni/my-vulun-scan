"use client"

import React from "react"
import { useOrganization } from "@/hooks/use-organizations"
import { LoadingState } from "@/components/loading-spinner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconBuilding, IconCalendar, IconClock, IconFileText, IconWorld } from "@tabler/icons-react"
import Link from "next/link"
import { AddDomainDialog } from "@/components/assets/domain/add-domain-dialog"
import { Plus } from "lucide-react"

interface OrganizationDetailViewProps {
  organizationId: string
}

/**
 * 组织详情视图组件
 * 显示组织的详细信息
 */
export function OrganizationDetailView({ organizationId }: OrganizationDetailViewProps) {
  const { data: organization, isLoading, error, refetch } = useOrganization(parseInt(organizationId))
  
  // 添加域名对话框状态
  const [isAddDomainDialogOpen, setIsAddDomainDialogOpen] = React.useState(false)

  // 格式化日期
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <span className="text-destructive">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">加载失败</h3>
        <p className="text-muted-foreground text-center mb-4">
          {error.message || "加载组织详情时出现错误，请重试"}
        </p>
        <button 
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          重新加载
        </button>
      </div>
    )
  }

  // 加载状态
  if (isLoading) {
    return <LoadingState message="加载组织详情中..." />
  }

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">组织不存在</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 组织基本信息卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <IconBuilding className="text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{organization.name}</CardTitle>
                <CardDescription className="mt-1">Organization Details</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 描述 */}
          {organization.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <IconFileText />
                <span>Description</span>
              </div>
              <p className="text-sm pl-6">{organization.description}</p>
            </div>
          )}

          {/* 时间信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            {/* 创建时间 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <IconCalendar />
                <span>Created At</span>
              </div>
              <p className="text-sm pl-6 font-mono">{formatDate(organization.createdAt)}</p>
            </div>

            {/* 更新时间 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <IconClock />
                <span>Updated At</span>
              </div>
              <p className="text-sm pl-6 font-mono">{formatDate(organization.updatedAt)}</p>
            </div>
          </div>

          {/* ID 信息 */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <span>ID</span>
            </div>
            <p className="text-sm pl-6 font-mono text-muted-foreground">{organization.id}</p>
          </div>
        </CardContent>
      </Card>

      {/* 域名列表卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <IconWorld className="text-blue-500" />
              </div>
              <div>
                <CardTitle>主资产（域名）</CardTitle>
                <CardDescription>
                  {organization.domains && organization.domains.length > 0
                    ? `共 ${organization.domains.length} 个域名`
                    : "暂无绑定域名"}
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddDomainDialogOpen(true)}
            >
              <Plus />
              添加域名
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {organization.domains && organization.domains.length > 0 ? (
            <div className="space-y-2">
              {organization.domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-1.5 bg-blue-500/10 rounded">
                      <IconWorld className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/assets/domain/${domain.id}`}
                        className="font-medium text-primary hover:underline block truncate"
                      >
                        {domain.name}
                      </Link>
                      {domain.description && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {domain.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0">
                    ID: {domain.id}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <IconWorld className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>暂无绑定的域名</p>
              <p className="text-sm mt-1">可以在域名管理页面将域名关联到此组织</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 添加域名对话框 */}
      <AddDomainDialog
        open={isAddDomainDialogOpen}
        onOpenChange={setIsAddDomainDialogOpen}
        presetOrganizationId={organization.id}
        onAdd={() => {
          // 添加成功后刷新组织数据
          refetch()
        }}
      />
    </div>
  )
}
