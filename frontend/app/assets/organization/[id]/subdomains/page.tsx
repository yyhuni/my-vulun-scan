"use client"

import React from "react"
import { OrganizationSubdomainsDetailView } from "@/components/assets/organization/subdomains/subdomains-detail-view"

/**
 * 组织的子域名页面
 * 显示组织下的子域名详情
 */
export default function OrganizationSubdomainsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <OrganizationSubdomainsDetailView organizationId={resolvedParams.id} />
    </div>
  )
}
