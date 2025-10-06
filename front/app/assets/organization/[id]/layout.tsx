"use client"

import React from "react"
import { useRouter, usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2 } from "lucide-react"
import { LoadingState } from "@/components/ui/loading-spinner"
import { useOrganization } from "@/hooks/use-organizations"
import type { Organization } from "@/types/organization.types"

/**
 * 组织详情布局
 * 为所有子页面提供共享的组织信息和导航
 */
export default function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const resolvedParams = React.use(params)
  const router = useRouter()
  const pathname = usePathname()

  // 使用 React Query 获取组织数据
  const {
    data: organization,
    isLoading,
    error
  } = useOrganization(Number(resolvedParams.id))

  // 获取当前激活的 Tab
  const getActiveTab = () => {
    if (pathname.includes("/main-assets")) return "main-assets"
    if (pathname.includes("/subdomains")) return "subdomains"
    if (pathname.includes("/endpoints")) return "endpoints"
    return ""
  }

  // 处理 Tab 切换
  const handleTabChange = (value: string) => {
    const basePath = `/assets/organization/${resolvedParams.id}`
    switch (value) {
      case "main-assets":
        router.push(`${basePath}/main-assets`)
        break
      case "subdomains":
        router.push(`${basePath}/subdomains`)
        break
      case "endpoints":
        router.push(`${basePath}/endpoints`)
        break
    }
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <LoadingState message="加载组织数据中..." />
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-destructive mb-4" />
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
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">组织不存在</h3>
            <p className="text-muted-foreground">
              未找到ID为 {resolvedParams.id} 的组织
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
            <Building2 className="h-6 w-6" />
            {organization.name}
          </h2>
          <p className="text-muted-foreground">{organization.description}</p>
        </div>
      </div>

      {/* Tabs 导航 */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Tabs
          value={getActiveTab()}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
            <TabsTrigger value="main-assets">主资产</TabsTrigger>
            <TabsTrigger value="subdomains">子域名</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoint</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 子页面内容 */}
      {children}
    </div>
  )
}
