"use client"

import { useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface RoutePreloadOptions {
  priority?: 'high' | 'medium' | 'low'
  delay?: number
  condition?: () => boolean
}

interface RouteGroup {
  routes: string[]
  priority: 'high' | 'medium' | 'low'
  delay: number
}

// 路由分组配置
const ROUTE_GROUPS: Record<string, RouteGroup> = {
  core: {
    routes: ['/', '/workflow/overview', '/scan/overview', '/assets/overview'],
    priority: 'high',
    delay: 0
  },
  workflow: {
    routes: [
      '/workflow/management',
      '/workflow/components',
      '/workflow/history',
      '/workflow/edit'
    ],
    priority: 'medium',
    delay: 500
  },
  scan: {
    routes: [
      '/scan/history',
      '/scan/config',
      '/scan/create'
    ],
    priority: 'medium',
    delay: 500
  },
  assets: {
    routes: [
      '/assets/domains',
      '/assets/organizations'
    ],
    priority: 'medium',
    delay: 500
  },
  secondary: {
    routes: [
      '/scan/config'
    ],
    priority: 'low',
    delay: 2000
  }
}

export function useRoutePreload() {
  const router = useRouter()
  const pathname = usePathname()
  const timeoutIds = useRef(new Set<NodeJS.Timeout>());

  // 在组件卸载时，清理所有未执行的定时器
  useEffect(() => {
    return () => {
      timeoutIds.current.forEach(id => clearTimeout(id));
      timeoutIds.current.clear();
    };
  }, []);

  const managedSetTimeout = useCallback((callback: () => void, delay?: number) => {
    const id = setTimeout(() => {
      callback();
      timeoutIds.current.delete(id);
    }, delay);
    timeoutIds.current.add(id);
    return id;
  }, []);

  // 预加载单个路由
  const preloadRoute = useCallback(async (
    route: string,
    options: RoutePreloadOptions = {}
  ) => {
    const { delay = 0, condition } = options

    // 检查条件
    if (condition && !condition()) {
      return
    }

    // 避免预加载当前路由
    if (route === pathname) {
      return
    }

    try {
      const preloadFn = () => {
        // 添加错误边界和重试机制
        try {
          router.prefetch(route)
        } catch (error) {
          console.warn(`Failed to preload route: ${route}`, error)
          // 简单的重试机制
          managedSetTimeout(() => {
            try {
              router.prefetch(route)
            } catch (retryError) {
              console.warn(`Retry failed for route: ${route}`, retryError)
            }
          }, 1000)
        }
      }

      if (delay > 0) {
        managedSetTimeout(preloadFn, delay)
      } else {
        preloadFn()
      }
    } catch (error) {
      console.warn(`Failed to setup preload for route: ${route}`, error)
    }
  }, [router, pathname, managedSetTimeout])

  // 预加载路由组
  const preloadRouteGroup = useCallback((groupName: string) => {
    const group = ROUTE_GROUPS[groupName]
    if (!group) return

    group.routes.forEach(route => {
      preloadRoute(route, {
        priority: group.priority,
        delay: group.delay
      })
    })
  }, [preloadRoute])

  // 根据当前路径智能预加载 - 立即执行，不延迟
  const smartPreload = useCallback(() => {
    try {
      // 立即预加载核心路由
      preloadRouteGroup('core')

      // 根据当前路径立即预加载相关路由
      if (pathname.startsWith('/workflow')) {
        preloadRouteGroup('workflow')
        // 延迟预加载其他模块，避免过多并发
        managedSetTimeout(() => preloadRouteGroup('scan'), 1000)
        managedSetTimeout(() => preloadRouteGroup('assets'), 2000)
      } else if (pathname.startsWith('/scan')) {
        preloadRouteGroup('scan')
        managedSetTimeout(() => preloadRouteGroup('workflow'), 1000)
        managedSetTimeout(() => preloadRouteGroup('assets'), 2000)
      } else if (pathname.startsWith('/assets')) {
        preloadRouteGroup('assets')
        managedSetTimeout(() => preloadRouteGroup('workflow'), 1000)
        managedSetTimeout(() => preloadRouteGroup('scan'), 2000)
      } else {
        // 首页或其他页面，立即预加载工作流
        preloadRouteGroup('workflow')
        managedSetTimeout(() => preloadRouteGroup('scan'), 500)
        managedSetTimeout(() => preloadRouteGroup('assets'), 1000)
      }

      // 延迟预加载次要路由
      managedSetTimeout(() => preloadRouteGroup('secondary'), 3000)
    } catch (error) {
      console.warn('Smart preload failed:', error)
    }
  }, [pathname, preloadRouteGroup, managedSetTimeout])

  // 预加载用户可能访问的路由（基于用户行为）
  const preloadUserLikelyRoutes = useCallback(() => {
    // 这里可以根据用户历史行为、时间等因素来预测
    // 目前使用简单的启发式规则

    const hour = new Date().getHours()

    // 工作时间更可能访问工作流和扫描 - 立即预加载
    if (hour >= 9 && hour <= 18) {
      preloadRoute('/workflow/management', { delay: 0 })
      preloadRoute('/scan/create', { delay: 0 })
    }

    // 根据一周中的天数调整预加载策略
    const dayOfWeek = new Date().getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // 工作日
      preloadRoute('/workflow/overview', { delay: 0 })
    }
  }, [preloadRoute])

  // 监听路径变化，触发智能预加载
  useEffect(() => {
    // 立即执行预加载，不延迟
    smartPreload()
    preloadUserLikelyRoutes()
  }, [pathname, smartPreload, preloadUserLikelyRoutes])

  // 监听用户交互，预加载相关路由
  useEffect(() => {
    const handleMouseEnter = (event: MouseEvent) => {
      // 安全检查事件目标
      if (!event.target) return

      const target = event.target as Element

      // 检查是否为链接元素
      let link: HTMLAnchorElement | null = null

      if (target.tagName === 'A') {
        link = target as HTMLAnchorElement
      } else if (target.closest && typeof target.closest === 'function') {
        link = target.closest('a[href]') as HTMLAnchorElement
      }

      if (link && link.href) {
        try {
          const url = new URL(link.href)
          if (url.origin === window.location.origin && url.pathname !== pathname) {
            preloadRoute(url.pathname, { delay: 0 })
          }
        } catch (error) {
          // 忽略无效的URL
          console.debug('Invalid URL for preload:', link.href)
        }
      }
    }

    // 使用更安全的事件监听方式
    if (typeof document !== 'undefined') {
      document.addEventListener('mouseover', handleMouseEnter, { passive: true })

      return () => {
        document.removeEventListener('mouseover', handleMouseEnter)
      }
    }
  }, [preloadRoute, pathname])

  return {
    preloadRoute,
    preloadRouteGroup,
    smartPreload,
    preloadUserLikelyRoutes
  }
}
