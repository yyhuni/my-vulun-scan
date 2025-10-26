"use client"

import React from "react"
import { useParams } from "next/navigation"
import { AssetEndpointsDetailView } from "@/components/assets/asset/endpoints/asset-endpoints-detail-view"

/**
 * 资产端点页面
 * 显示资产下的端点详情
 */
export default function AssetEndpointsPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <AssetEndpointsDetailView assetId={parseInt(id)} />
    </div>
  )
}
