"use client"

import React from "react"
import { EndpointsList } from "@/components/assets/domain/endpoints/endpoints-list"

/**
 * 域名的 Endpoint 页面
 * 显示域名下的 Endpoint 列表
 */
export default function DomainEndpointsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <EndpointsList domainId={resolvedParams.id} />
    </div>
  )
}
