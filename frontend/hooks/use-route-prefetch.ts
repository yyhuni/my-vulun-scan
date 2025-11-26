import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * 路由预加载 Hook
 * 在页面加载完成后，后台预加载其他页面的 JS/CSS 资源
 * 不会发送 API 请求，只加载页面组件
 * @param currentPath 当前页面路径（可选），如果提供则会智能预加载相关动态路由
 */
export function useRoutePrefetch(currentPath?: string) {
  const router = useRouter()

  useEffect(() => {
    console.log('[START] 路由预加载 Hook 已挂载，将在 2 秒后开始预加载...')

    // 延迟 2 秒后开始预加载，避免影响当前页面性能
    const timer = setTimeout(() => {
      console.log('[TIMER] 2 秒已到，开始预加载路由...')

      const routes = [
        '/assets/organization',
        '/assets/domain',
        '/assets/endpoint',
        '/scan/tools',
        '/scan/history',
        '/dashboard',
      ]

      routes.forEach((route) => {
        console.log(`  -> 预加载: ${route}`)
        router.prefetch(route)
      })

      // 如果提供了当前路径，智能预加载相关动态路由
      if (currentPath) {
        // 如果是域名详情页（如 /assets/domain/146），预加载子路由
        const domainIdMatch = currentPath.match(/\/assets\/domain\/(\d+)/)
        if (domainIdMatch) {
          const domainId = domainIdMatch[1]
          router.prefetch(`/assets/domain/${domainId}/endpoints`)
          console.log(`  -> 智能预加载域名子路由: /assets/domain/${domainId}/endpoints`)
        }
      }

      console.log('[DONE] 所有路由预加载请求已发送')
      console.log('[INFO] 提示：开发模式下预加载可能不明显，请在生产构建中测试')
    }, 2000)

    return () => {
      console.log('[UNMOUNT] 路由预加载 Hook 已卸载')
      clearTimeout(timer)
    }
  }, [router, currentPath])
}

/**
 * 智能路由预加载 Hook
 * 根据当前路径，预加载用户可能访问的下一个页面
 * @param currentPath 当前页面路径
 */
export function useSmartRoutePrefetch(currentPath: string) {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPath.includes('/assets/organization')) {
        // 在组织页面，预加载域名页面
        router.prefetch('/assets/domain')
      } else if (currentPath.includes('/assets/domain')) {
        // 在域名页面，预加载端点页面
        router.prefetch('/assets/endpoint')

        // 如果是域名详情页（如 /assets/domain/146），预加载子路由
        const domainIdMatch = currentPath.match(/\/assets\/domain\/(\d+)$/)
        if (domainIdMatch) {
          const domainId = domainIdMatch[1]
          router.prefetch(`/assets/domain/${domainId}/endpoints`)
          console.log(`  -> 预加载域名子路由: /assets/domain/${domainId}/endpoints`)
        }
      } else if (currentPath.includes('/assets/scan')) {
        // 在扫描页面，预加载资产页面
        router.prefetch('/assets/organization')
        router.prefetch('/assets/domain')
      } else if (currentPath === '/') {
        // 在首页，预加载主要页面
        router.prefetch('/dashboard')
        router.prefetch('/assets/organization')
      }
    }, 1500) // 1.5 秒后预加载

    return () => clearTimeout(timer)
  }, [currentPath, router])
}
