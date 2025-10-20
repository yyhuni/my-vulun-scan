"use client"

import React from "react"
import { SubdomainsList } from "@/components/assets/domain/subdomains/subdomains-list"

/**
 * 域名的子域名页面
 * 显示域名下的子域名列表
 */
export default function DomainSubdomainsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <SubdomainsList domainId={resolvedParams.id} />
    </div>
  )
}
