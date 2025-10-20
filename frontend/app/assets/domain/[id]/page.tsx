"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoadingState } from "@/components/loading-spinner"

/**
 * 域名详情页面
 * 自动重定向到子域名页面
 */
export default function DomainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)  // 获取 URL 中的 id 参数
  const router = useRouter()

  useEffect(() => {
    // 自动跳转到子域名页面
    router.replace(`/assets/domain/${resolvedParams.id}/subdomains`)
  }, [resolvedParams.id, router])

  return <LoadingState message="正在跳转..." />
}
