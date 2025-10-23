"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoadingState } from "@/components/loading-spinner"

/**
 * 组织详情页面
 * 自动重定向到主资产页面
 */
export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)  // 获取 URL 中的 id 参数
  const router = useRouter()

  useEffect(() => {
    // 自动跳转到主资产页面
    router.replace(`/assets/organization/${resolvedParams.id}/assets`)
  }, [resolvedParams.id, router])

  return <LoadingState message="正在跳转..." />
}
