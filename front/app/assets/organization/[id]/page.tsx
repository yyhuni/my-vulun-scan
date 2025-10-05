"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * 组织详情页面
 * 自动重定向到主资产页面
 */
export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)
  const router = useRouter()

  useEffect(() => {
    // 自动跳转到主资产页面
    router.replace(`/assets/organization/${resolvedParams.id}/main-assets`)
  }, [resolvedParams.id, router])

  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      <span className="ml-2 text-muted-foreground">正在跳转...</span>
    </div>
  )
}
