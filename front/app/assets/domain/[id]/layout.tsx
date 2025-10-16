"use client"

import React from "react"
import { usePathname, useParams } from "next/navigation"
import Link from "next/link"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Globe } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useDomain } from "@/hooks/use-domains"

/**
 * 域名详情布局
 * 为所有子页面提供共享的域名信息和导航
 */
export default function DomainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { id } = useParams<{ id: string }>()
  const pathname = usePathname()

  // 使用 React Query 获取域名数据
  const {
    data: domain,
    isLoading,
    error
  } = useDomain(Number(id))

  // 获取当前激活的 Tab
  const getActiveTab = () => {
    if (pathname.includes("/subdomains")) return "subdomains"
    if (pathname.includes("/endpoints")) return "endpoints"
    return ""
  }

  // Tab 路径映射
  const basePath = `/assets/domain/${id}`
  const tabPaths = {
    subdomains: `${basePath}/subdomains`,
    endpoints: `${basePath}/endpoints`,
  }

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

        {/* Tabs 导航骨架 */}
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
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
            <Globe className="mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">加载失败</h3>
            <p className="text-muted-foreground">
              {error.message || "获取域名数据时出现错误"}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!domain) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Globe className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">域名不存在</h3>
            <p className="text-muted-foreground">
              未找到ID为 {id} 的域名
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
            <Globe />
            {domain.name}
          </h2>
          <p className="text-muted-foreground">{domain.description || "暂无描述"}</p>
        </div>
      </div>

      {/* Tabs 导航 - 使用 Link 确保触发进度条 */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Tabs value={getActiveTab()} className="w-full">
          <TabsList>
            <TabsTrigger value="subdomains" asChild>
              <Link href={tabPaths.subdomains}>子域名</Link>
            </TabsTrigger>
            <TabsTrigger value="endpoints" asChild>
              <Link href={tabPaths.endpoints}>Endpoint</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 子页面内容 */}
      {children}
    </div>
  )
}
