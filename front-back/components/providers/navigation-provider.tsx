"use client"

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * 导航上下文类型定义
 * 提供导航状态和导航方法
 */
interface NavigationContextType {
  isNavigating: boolean                    // 当前是否正在导航中
  navigateWithLoading: (href: string) => void  // 带加载状态的页面跳转
  replaceWithLoading: (href: string) => void   // 带加载状态的页面替换
  backWithLoading: () => void                  // 带加载状态的返回上一页
}

/**
 * 创建导航上下文
 * 用于在组件树中共享导航状态和方法
 */
const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

/**
 * 导航加载状态Hook
 * 允许组件访问导航状态和导航方法
 * 
 * @returns {NavigationContextType} 导航上下文对象
 * @throws {Error} 如果在NavigationProvider外部使用
 */
export function useNavigationLoading() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigationLoading must be used within a NavigationProvider')
  }
  return context
}

interface NavigationProviderProps {
  children: ReactNode
}

/**
 * 导航提供者组件
 * 管理全局导航状态，提供带加载状态的导航方法
 * 
 * 功能:
 * 1. 提供导航状态跟踪
 * 2. 自动在路由变化时重置加载状态
 * 3. 提供超时保护机制
 * 4. 处理页面可见性变化
 * 
 * @param {ReactNode} children - 子组件
 */
export default function NavigationProvider({ children }: NavigationProviderProps) {
  const [isNavigating, setIsNavigating] = useState(false)  // 导航状态
  const router = useRouter()  // Next.js路由器
  const pathname = usePathname()  // 当前路径
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)  // 超时引用
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 1. 为这个 effect 单独创建一个 ref

  // 监听路径变化，自动重置 loading 状态
  useEffect(() => {
    // 清除之前的超时
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // 重置 loading 状态
    setIsNavigating(false)
  }, [pathname])

  // 超时保护：如果 5 秒后还在 loading，强制重置
  // 防止导航卡住导致永久loading状态
  useEffect(() => {
    if (isNavigating) {
      timeoutRef.current = setTimeout(() => {
        console.warn('Navigation timeout detected, forcing reset')
        setIsNavigating(false)
      }, 5000) // 5 秒超时
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [isNavigating])

  // 页面可见性检测：当页面重新变为可见时，检查是否需要重置导航状态
  // 处理用户切换标签页或最小化窗口后返回的情况
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isNavigating) {
        // 先清除上一个可能存在的定时器，虽然在这个逻辑里不太可能，但是个好习惯
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current);
        }
        
        // 2. 将定时器 ID 存入 ref
        visibilityTimeoutRef.current = setTimeout(() => {
          if (isNavigating) {
            console.warn('Page became visible but still navigating, resetting state');
            setIsNavigating(false);
          }
        }, 300);
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 3. 在清理函数中，同时移除监听器和清除定时器
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
    }
    };
  }, [isNavigating])

  // 带 loading 的导航方法
  // 在路由跳转前设置loading状态，显示全局加载指示器
  const navigateWithLoading = useCallback((href: string) => {
    try {
      setIsNavigating(true)
      router.push(href)
    } catch (error) {
      console.error('Navigation error:', error)
      setIsNavigating(false)
    }
  }, [router])

  // 带 loading 的替换方法
  // 类似push但不保留历史记录
  const replaceWithLoading = useCallback((href: string) => {
    try {
      setIsNavigating(true)
      router.replace(href)
    } catch (error) {
      console.error('Navigation error:', error)
      setIsNavigating(false)
    }
  }, [router])

  // 带 loading 的返回方法
  // 返回上一页时显示加载状态
  const backWithLoading = useCallback(() => {
    try {
      setIsNavigating(true)
      router.back()
    } catch (error) {
      console.error('Navigation error:', error)
      setIsNavigating(false)
    }
  }, [router])

  // 创建上下文值，只在依赖项变化时重新创建
  const contextValue: NavigationContextType = useMemo(() => ({
    isNavigating,
    navigateWithLoading,
    replaceWithLoading,
    backWithLoading,
  }), [isNavigating, navigateWithLoading, replaceWithLoading, backWithLoading])

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  )
}