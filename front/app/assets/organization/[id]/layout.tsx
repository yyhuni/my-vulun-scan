"use client"

import React, { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2 } from "lucide-react"
import { toast } from "sonner"
import type { Organization } from "@/types/organization.types"
import { OrganizationService } from "@/services/organization.service"
import { Skeleton } from "@/components/ui/skeleton"

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

  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

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

  // 获取组织数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        const response = await OrganizationService.getOrganizations({
          id: resolvedParams.id
        })
        if (response.state === "success" && response.data) {
          // 当查询单个组织时，返回的是 Organization 对象
          setOrganization(response.data as Organization)
        } else {
          toast.error(response.message || "获取组织信息失败")
          setOrganization(null)
        }
      } catch (error) {
        console.error("获取组织数据失败:", error)
        toast.error("获取组织数据失败")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [resolvedParams.id])

  if (loading) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">加载组织数据中...</span>
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
