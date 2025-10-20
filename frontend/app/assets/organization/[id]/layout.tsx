"use client"

import React from "react"
import { useParams } from "next/navigation"
import { Building2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useOrganization } from "@/hooks/use-organizations"

/**
 * 组织详情布局
 * 为主资产页面提供共享的组织信息
 */
export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { id } = useParams<{ id: string }>()

  // 使用 React Query 获取组织数据
  const {
    data: organization,
    isLoading,
    error
  } = useOrganization(Number(id))

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* 页面头部骨架 */}
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div className="w-full max-w-xl space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-7 w-48" />
            </div>
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Building2 className="mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">加载失败</h3>
            <p className="text-muted-foreground">
              {error.message || "获取组织数据时出现错误"}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Building2 className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">组织不存在</h3>
            <p className="text-muted-foreground">
              未找到ID为 {id} 的组织
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 />
            {organization.name}
          </h2>
          <p className="text-muted-foreground">{organization.description}</p>
        </div>
      </div>

      {/* 子页面内容 */}
      {children}
    </div>
  )
}
