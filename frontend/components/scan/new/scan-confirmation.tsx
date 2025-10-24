"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconBuilding, IconRadar, IconFileDescription } from "@tabler/icons-react"
import type { Organization } from "@/types/organization.types"

interface ScanConfirmationProps {
  organizations: Organization[]
  scanName: string
  scanType: string
  description: string
}

/**
 * 扫描确认组件
 * 显示扫描任务的配置摘要，供用户确认
 */
export function ScanConfirmation({
  organizations,
  scanName,
  scanType,
  description,
}: ScanConfirmationProps) {
  // 计算总资产数
  const totalAssets = organizations.reduce((sum, org) => sum + (org.assets?.length || 0), 0)
  const getScanTypeLabel = (type: string) => {
    switch (type) {
      case "full":
        return "完整扫描"
      case "quick":
        return "快速扫描"
      case "custom":
        return "自定义扫描"
      default:
        return type
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">确认扫描配置</h3>
        <p className="text-sm text-muted-foreground">
          请确认以下信息无误后，点击&quot;启动扫描&quot;按钮
        </p>
      </div>

      <div className="grid gap-4">
        {/* 目标组织 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <IconBuilding className="size-5 text-primary" />
              <CardTitle className="text-base">目标组织</CardTitle>
            </div>
            <CardDescription>
              已选择 {organizations.length} 个组织，共 {totalAssets} 个资产
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-start justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <IconBuilding className="size-4 text-primary flex-shrink-0" />
                      <p className="text-sm font-medium truncate">{org.name}</p>
                    </div>
                    {org.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {org.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="ml-2 flex-shrink-0">
                    {org.assets?.length || 0}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 扫描配置 */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <IconRadar className="size-5 text-primary" />
                <CardTitle className="text-base">扫描配置</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">任务名称</p>
                <p className="text-sm font-medium">{scanName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">扫描类型</p>
                <Badge variant="outline">{getScanTypeLabel(scanType)}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* 统计信息 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">扫描范围</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">组织数量</span>
                <span className="text-sm font-medium">{organizations.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">资产数量</span>
                <span className="text-sm font-medium">{totalAssets}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 描述信息 */}
      {description && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <IconFileDescription className="size-5 text-primary" />
              <CardTitle className="text-base">任务描述</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 提示信息 */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">提示：</span>
          扫描任务启动后将在后台运行，您可以在扫描历史页面查看进度和结果。
        </p>
      </div>
    </div>
  )
}
