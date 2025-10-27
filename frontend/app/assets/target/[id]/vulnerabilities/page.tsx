"use client"

import React from "react"
import { useParams } from "next/navigation"
import { TargetVulnerabilitiesDetailView } from "@/components/assets/target/vulnerabilities/target-vulnerabilities-detail-view"

/**
 * 目标漏洞页面
 * 显示目标下的漏洞详情
 */
export default function TargetVulnerabilitiesPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <TargetVulnerabilitiesDetailView targetId={parseInt(id)} />
    </div>
  )
}

