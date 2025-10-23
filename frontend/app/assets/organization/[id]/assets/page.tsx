"use client"

import React from "react"
import { OrganizationAssetsDetailView } from "@/components/assets/organization/assets/assets-detail-view"

/**
 * 组织的主资产页面
 * 显示组织下的主资产（域名）详情
 */
export default function OrganizationAssetsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <OrganizationAssetsDetailView organizationId={resolvedParams.id} />
    </div>
  )
}
