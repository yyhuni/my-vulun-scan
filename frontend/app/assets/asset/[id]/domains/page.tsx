"use client"

import React from "react"
import { useParams } from "next/navigation"
import { AssetDomainsDetailView } from "@/components/assets/asset/domains/asset-domains-detail-view"

/**
 * 资产域名页面
 * 显示资产下的域名详情
 */
export default function AssetDomainsPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <AssetDomainsDetailView assetId={parseInt(id)} />
    </div>
  )
}
