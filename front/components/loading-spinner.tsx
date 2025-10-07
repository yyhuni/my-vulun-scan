import React from "react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

/**
 * 统一的加载动画组件
 * 
 * 特性：
 * - 三种尺寸：sm(16px), md(24px), lg(32px)
 * - 支持自定义样式
 * - 使用 Tailwind CSS 动画
 */
export function LoadingSpinner({ size = "sm", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="加载中"
    >
      <span className="sr-only">加载中...</span>
    </div>
  )
}

interface LoadingStateProps {
  message?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

/**
 * 带文字的加载状态组件
 * 
 * 用于页面级别的加载状态显示
 */
export function LoadingState({ 
  message = "加载中...", 
  size = "md", 
  className 
}: LoadingStateProps) {
  const dotSizes = {
    sm: "w-2 h-2",
    md: "w-3 h-3", 
    lg: "w-4 h-4"
  }

  return (
    <div className={cn("flex items-center justify-center min-h-[200px] w-full", className)}>
      <div className="flex flex-col items-center space-y-4">
        <div className="flex space-x-2">
          <div className={cn(
            "bg-primary rounded-full animate-pulse",
            dotSizes[size]
          )} style={{ animationDelay: "0ms" }} />
          <div className={cn(
            "bg-primary rounded-full animate-pulse",
            dotSizes[size]
          )} style={{ animationDelay: "150ms" }} />
          <div className={cn(
            "bg-primary rounded-full animate-pulse",
            dotSizes[size]
          )} style={{ animationDelay: "300ms" }} />
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
  children: React.ReactNode
}

/**
 * 加载遮罩组件
 * 
 * 在现有内容上显示加载遮罩
 */
export function LoadingOverlay({ 
  isLoading, 
  message = "加载中...", 
  children 
}: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center space-y-2">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
