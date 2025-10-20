"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconBuilding, IconWorld, IconChevronDown, IconChevronUp, IconLoader2 } from "@tabler/icons-react"
import type { Organization } from "@/types/organization.types"
import type { SubDomain } from "@/types/subdomain.types"
import { useSubdomains } from "@/hooks/use-subdomains"

interface TargetConfirmationProps {
  organizations: Organization[]
}

/**
 * 目标确认组件
 * 显示所选组织及其子域名
 */
export function TargetConfirmation({ organizations }: TargetConfirmationProps) {
  const [expandedOrgs, setExpandedOrgs] = useState<Set<number>>(new Set())

  // 切换展开/收起
  const toggleOrg = (orgId: number) => {
    setExpandedOrgs((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(orgId)) {
        newSet.delete(orgId)
      } else {
        newSet.add(orgId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">确认目标</h3>
        <p className="text-sm text-muted-foreground">
          查看所选组织的域名和子域名详情，确认扫描目标
        </p>
      </div>

      <div className="space-y-4">
        {organizations.map((org) => (
          <OrgSubdomainCard
            key={org.id}
            organization={org}
            isExpanded={expandedOrgs.has(org.id)}
            onToggle={() => toggleOrg(org.id)}
          />
        ))}
      </div>

      {/* 统计信息 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {organizations.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">组织数量</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {organizations.reduce((sum, org) => sum + (org.domains?.length || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">域名数量</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">-</p>
              <p className="text-xs text-muted-foreground mt-1">子域名数量</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">-</p>
              <p className="text-xs text-muted-foreground mt-1">端点数量</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 单个组织的子域名卡片
 */
function OrgSubdomainCard({
  organization,
  isExpanded,
  onToggle,
}: {
  organization: Organization
  isExpanded: boolean
  onToggle: () => void
}) {
  // 获取组织的子域名（只在展开时加载）
  const { data: subdomainsData, isLoading } = useSubdomains({
    organizationId: organization.id.toString(),
    page: 1,
    pageSize: 100, // 显示前100个子域名
  })

  const subdomains = subdomainsData?.subDomains || []
  const totalSubdomains = subdomainsData?.total || 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <IconBuilding className="size-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{organization.name}</CardTitle>
              {organization.description && (
                <CardDescription className="line-clamp-1">
                  {organization.description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {organization.domains?.length || 0} 域名
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="ml-2"
            >
              {isExpanded ? (
                <IconChevronUp className="size-4" />
              ) : (
                <IconChevronDown className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* 展开内容 */}
      {isExpanded && (
        <CardContent>
          {/* 域名列表 */}
          {organization.domains && organization.domains.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-sm font-medium text-muted-foreground">域名列表</p>
              <div className="space-y-1.5">
                {organization.domains.map((domain) => (
                  <div
                    key={domain.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-sm"
                  >
                    <IconWorld className="size-4 text-primary flex-shrink-0" />
                    <span className="font-mono truncate">{domain.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 子域名列表 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">子域名列表</p>
              {totalSubdomains > 0 && (
                <Badge variant="outline" className="text-xs">
                  共 {totalSubdomains} 个
                </Badge>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : subdomains.length > 0 ? (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {subdomains.map((subdomain: SubDomain) => (
                  <div
                    key={subdomain.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-sm"
                  >
                    <IconWorld className="size-4 text-blue-500 flex-shrink-0" />
                    <span className="font-mono truncate">{subdomain.name}</span>
                    {subdomain.isRoot && (
                      <Badge variant="secondary" className="text-xs ml-auto flex-shrink-0">
                        根域名
                      </Badge>
                    )}
                  </div>
                ))}
                {totalSubdomains > subdomains.length && (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    还有 {totalSubdomains - subdomains.length} 个子域名未显示
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                暂无子域名
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
