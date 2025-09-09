"use client"

import { useNavigationLoading } from '@/components/providers/navigation-provider'

/**
 * 简化的导航 Hook
 * 
 * 提供简单的导航方法，用于非 Button 组件的导航
 */
export function useNavigation() {
  const { navigateWithLoading, replaceWithLoading, backWithLoading } = useNavigationLoading()

  return {
    navigate: navigateWithLoading,
    replace: replaceWithLoading,
    back: backWithLoading,
  }
}
