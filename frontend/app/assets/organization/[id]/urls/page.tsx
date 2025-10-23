"use client"

import React from "react"
import { OrganizationUrlsDetailView } from "@/components/assets/organization/urls/urls-detail-view"

/**
 * 组织的 URL/Endpoint 页面
 * 显示组织下的 URL/Endpoint 详情
 */
export default function OrganizationUrlsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <OrganizationUrlsDetailView organizationId={resolvedParams.id} />
    </div>
  )
}
