"use client"

import React from "react"
import { useParams } from "next/navigation"
import { AssetUrlsDetailView } from "@/components/assets/asset/urls/asset-urls-detail-view"

/**
 * 资产 URL 页面
 * 显示资产下的 URL 详情
 */
export default function AssetUrlsPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <AssetUrlsDetailView assetId={parseInt(id)} />
    </div>
  )
}
