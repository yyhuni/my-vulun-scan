"use client"

import React from "react"
import { useRouter, usePathname, useParams } from "next/navigation"
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
  const router = useRouter()
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

  // 处理 Tab 切换
  const handleTabChange = (value: string) => {
    const basePath = `/assets/domain/${id}`
    switch (value) {
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
            <Globe className="h-12 w-12 mx-auto text-destructive mb-4" />
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
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
            <Globe className="h-6 w-6" />
            {domain.name}
          </h2>
          <p className="text-muted-foreground">{domain.description || "暂无描述"}</p>
        </div>
      </div>

      {/* Tabs 导航 */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Tabs
          value={getActiveTab()}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList>
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
