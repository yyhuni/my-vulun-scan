"use client"

import React from "react"
import { MainAssetsList } from "@/components/assets/organization/main-assets/main-assets-list"

/**
 * 主资产页面
 * 显示组织的主资产列表
 */
export default function MainAssetsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <MainAssetsList organizationId={resolvedParams.id} />
    </div>
  )
}
