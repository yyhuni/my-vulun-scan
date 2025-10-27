"use client"

import React from "react"
import { useParams } from "next/navigation"
import { TargetDomainsDetailView } from "@/components/assets/target/domains/target-domains-detail-view"

/**
 * 目标域名页面
 * 显示目标下的域名详情
 */
export default function TargetDomainsPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <TargetDomainsDetailView targetId={parseInt(id)} />
    </div>
  )
}

