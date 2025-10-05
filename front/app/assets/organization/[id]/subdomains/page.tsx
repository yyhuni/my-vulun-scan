"use client"

import React from "react"
import { SubdomainsList } from "@/components/assets/organization/subdomains/subdomains-list"

/**
 * 子域名页面
 * 显示组织的子域名列表
 */
export default function SubdomainsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <SubdomainsList organizationId={resolvedParams.id} />
    </div>
  )
}
