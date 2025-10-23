"use client"

import React from "react"
import { OrganizationDomainsDetailView } from "@/components/assets/organization/domains/domains-detail-view"

/**
 * 组织的域名页面
 * 显示组织下的域名详情
 */
export default function OrganizationDomainsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <OrganizationDomainsDetailView />
    </div>
  )
}
