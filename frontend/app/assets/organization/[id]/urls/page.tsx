"use client"

import React from "react"
import { OrganizationEndpointsDetailView } from "@/components/assets/organization/endpoints/endpoints-detail-view"

/**
 * 组织的端点页面
 * 显示组织下的端点详情
 */
export default function OrganizationEndpointsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <OrganizationEndpointsDetailView organizationId={resolvedParams.id} />
    </div>
  )
}
