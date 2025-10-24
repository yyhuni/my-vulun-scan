"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoadingState } from "@/components/loading-spinner"

/**
 * 资产详情页面
 * 自动重定向到域名页面
 */
export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)  // 获取 URL 中的 id 参数
  const router = useRouter()

  useEffect(() => {
    // 自动跳转到域名页面
    router.replace(`/assets/asset/${resolvedParams.id}/domains`)
  }, [resolvedParams.id, router])

  return <LoadingState message="正在跳转..." />
}
