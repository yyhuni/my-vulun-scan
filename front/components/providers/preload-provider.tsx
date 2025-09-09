"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useRoutePreload } from '@/hooks/use-route-preload'

interface PreloadContextType {
  preloadedRoutes: Set<string>
  preloadRoute: (route: string) => void
}

const PreloadContext = createContext<PreloadContextType | undefined>(undefined)

export function usePreload() {
  const context = useContext(PreloadContext)
  if (!context) {
    throw new Error('usePreload must be used within a PreloadProvider')
  }
  return context
}

interface PreloadProviderProps {
  children: ReactNode
}

// 预加载提供器现在使用智能预加载hook，不需要本地路由配置

export default function PreloadProvider({ children }: PreloadProviderProps) {
  const [preloadedRoutes, setPreloadedRoutes] = useState<Set<string>>(new Set())
  const pathname = usePathname()
  const router = useRouter()

  // 使用智能预加载hook
  const { smartPreload } = useRoutePreload()

  // 预加载单个路由 - 添加错误处理和防抖
  const preloadRoute = async (route: string) => {
    if (preloadedRoutes.has(route) || route === pathname) return

    try {
      // 使用Next.js原生prefetch，添加错误边界
      router.prefetch(route)
      setPreloadedRoutes(prev => new Set([...prev, route]))
    } catch (error) {
      console.warn(`Failed to preload route: ${route}`, error)
      // 不要重复尝试失败的路由
    }
  }

  // 初始化预加载 - 使用智能预加载
  useEffect(() => {
    // 立即执行预加载，不延迟
    smartPreload()
  }, [pathname, smartPreload])

  const contextValue: PreloadContextType = {
    preloadedRoutes,
    preloadRoute,
  }

  return (
    <PreloadContext.Provider value={contextValue}>
      {children}
    </PreloadContext.Provider>
  )
}
