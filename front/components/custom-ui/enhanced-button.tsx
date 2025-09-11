"use client"

import * as React from "react"
import { useCallback } from "react"
import { Button, ButtonProps } from "./button"
import { useNavigationLoading } from "@/components/providers/navigation-provider"

interface EnhancedButtonProps extends ButtonProps {
  href?: string // 如果提供 href，点击时自动导航
  replace?: boolean // 是否使用 replace 而不是 push
}

/**
 * 增强版按钮组件
 *
 * 功能：
 * 1. 如果提供 href 属性，点击时自动显示全局 loading 并导航
 * 2. 如果没有 href，行为与普通 Button 相同
 * 3. 完全兼容原有的 Button API
 * 4. 自动处理 disabled 状态，防止重复点击
 */
const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ href, replace = false, onClick, children, disabled, ...props }, ref) => {
    const { navigateWithLoading, replaceWithLoading, isNavigating } = useNavigationLoading()

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      // 如果正在导航中，阻止重复点击
      if (isNavigating && href) {
        e.preventDefault()
        return
      }

      // 如果有自定义的 onClick，先执行
      if (onClick) {
        onClick(e)
      }

      // 如果提供了 href，执行导航
      if (href && !e.defaultPrevented) {
        if (replace) {
          replaceWithLoading(href)
        } else {
          navigateWithLoading(href)
        }
      }
    }, [isNavigating, href, onClick, replace, replaceWithLoading, navigateWithLoading])

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={disabled || (isNavigating && !!href)} // 导航中时禁用导航按钮
        {...props}
      >
        {children}
      </Button>
    )
  }
)

EnhancedButton.displayName = "EnhancedButton"

export { EnhancedButton, type EnhancedButtonProps }
