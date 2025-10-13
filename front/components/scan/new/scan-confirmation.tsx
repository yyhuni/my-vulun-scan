"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconBuilding, IconRadar, IconFileDescription } from "@tabler/icons-react"
import type { Organization } from "@/types/organization.types"

interface ScanConfirmationProps {
  organization: Organization | null
  scanName: string
  scanType: string
  description: string
}

/**
 * 扫描确认组件
 * 显示扫描任务的配置摘要，供用户确认
 */
export function ScanConfirmation({
  organization,
  scanName,
  scanType,
  description,
}: ScanConfirmationProps) {
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
          请确认以下信息无误后，点击"启动扫描"按钮
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 目标组织 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <IconBuilding className="size-5 text-primary" />
              <CardTitle className="text-base">目标组织</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium">{organization?.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {organization?.description || "无描述"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {organization?.domains?.length || 0} 个域名
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 扫描配置 */}
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
