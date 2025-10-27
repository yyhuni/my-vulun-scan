"use client"

import React from "react"
import { useParams } from "next/navigation"
import { TargetEndpointsDetailView } from "@/components/assets/target/endpoints/target-endpoints-detail-view"

/**
 * 目标端点页面
 * 显示目标下的端点详情
 */
export default function TargetEndpointsPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <TargetEndpointsDetailView targetId={parseInt(id)} />
    </div>
  )
}

