"use client"

import React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { LoadingState } from "@/components/loading-spinner"

// 不需要登录的公开路由
const PUBLIC_ROUTES = ["/login"]

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * 认证守卫组件
 * 保护需要登录的路由
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: auth, isLoading, isError } = useAuth()

  // 检查是否是公开路由
  const isPublicRoute = PUBLIC_ROUTES.some((route) => 
    pathname.startsWith(route)
  )

  React.useEffect(() => {
    // 加载中或公开路由不处理
    if (isLoading || isPublicRoute) return

    // 未登录跳转登录页
    if (!auth?.authenticated) {
      router.push("/login/")
    }
  }, [auth, isLoading, isPublicRoute, router])

  // 加载中显示 loading
  if (isLoading) {
    return <LoadingState message="验证登录状态..." />
  }

  // 公开路由直接渲染
  if (isPublicRoute) {
    return <>{children}</>
  }

  // 未登录不渲染内容（等待跳转）
  if (!auth?.authenticated) {
    return <LoadingState message="验证登录状态..." />
  }

  // 已登录渲染内容
  return <>{children}</>
}
