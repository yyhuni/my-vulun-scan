"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconBuilding, IconWorld, IconChevronDown, IconChevronUp } from "@tabler/icons-react"
import type { Organization } from "@/types/organization.types"

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
                {organizations.reduce((sum, org) => sum + (org.assets?.length || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">资产数量</p>
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
 * 单个组织的域名卡片
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
              {organization.assets?.length || 0} 资产
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
          {/* 资产列表 */}
          {organization.assets && organization.assets.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">资产列表</p>
              <div className="space-y-1.5">
                {organization.assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-sm"
                  >
                    <IconWorld className="size-4 text-primary flex-shrink-0" />
                    <span className="font-mono truncate">{asset.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              暂无资产
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
