"use client"

import { useNavigationLoading } from '@/components/providers/navigation-provider'
import Loading from './loading'

/**
 * 全局导航加载组件
 * 
 * 当用户点击导航按钮时显示全屏 loading
 * 自动在路由变化完成后隐藏
 */
export default function NavigationLoading() {
  const { isNavigating } = useNavigationLoading()

  if (!isNavigating) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <Loading
        fullScreen={true}
        text="正在跳转..."
        size="lg"
      />
    </div>
  )
}
