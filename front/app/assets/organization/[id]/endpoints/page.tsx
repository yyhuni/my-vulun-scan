"use client"

import React from "react"
import { EndpointsList } from "@/components/assets/organization/endpoints/endpoints-list"

/**
 * Endpoint 页面
 * 显示组织的 Endpoint 列表
 */
export default function EndpointsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <EndpointsList organizationId={resolvedParams.id} />
    </div>
  )
}
