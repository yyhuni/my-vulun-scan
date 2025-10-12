"use client"

import React from "react"
import { OrganizationDetailView } from "@/components/assets/organization/organization-detail-view"

/**
 * 组织详情页面
 * 显示组织的详细信息
 */
export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <OrganizationDetailView organizationId={resolvedParams.id} />
    </div>
  )
}
