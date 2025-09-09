"use client"

import { ReactNode } from "react"
import { LucideIcon } from "lucide-react"
import Loading from "./loading"
import FallbackPage from "./fallback-page"
import EmptyState from "./empty-state"

export type DataViewState = "loading" | "data" | "empty" | "error"

interface DataStateWrapperProps {
  state: DataViewState
  
  // Loading 配置
  loadingText?: string
  loadingSize?: "sm" | "md" | "lg"
  
  // Empty 配置
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: {
    label: string
    onClick?: () => void
    href?: string // 支持导航
    variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link"
    disabled?: boolean
  }
  
  // Error 配置
  errorStatusCode?: number
  errorTitle?: string
  errorDescription?: string
  showRetry?: boolean
  onRetry?: () => void
  
  // Data 内容
  children: ReactNode
  
  // 额外的检查条件（比如过滤后的数据是否为空）
  hasData?: boolean
  
  // 类名
  className?: string
}

export default function DataStateWrapper({
  state,
  loadingText = "正在加载数据...",
  loadingSize = "md",
  emptyIcon,
  emptyTitle = "暂无数据",
  emptyDescription = "当前没有可显示的数据",
  emptyAction,
  errorStatusCode = 500,
  errorTitle,
  errorDescription,
  showRetry = false,
  onRetry,
  children,
  hasData = true,
  className,
}: DataStateWrapperProps) {
  
  // Loading 状态
  if (state === "loading") {
    return (
      <Loading 
        text={loadingText} 
        size={loadingSize}
        className={className}
      />
    )
  }
  
  // Error 状态
  if (state === "error") {
    return (
      <FallbackPage
        statusCode={errorStatusCode}
        title={errorTitle}
        description={errorDescription}
        showRetry={showRetry}
        onRetry={onRetry}
      />
    )
  }
  
  // Empty 状态
  if (state === "empty") {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    )
  }
  
  // Data 状态 - 检查是否真的有数据
  if (state === "data") {
    if (!hasData) {
      // 虽然状态是 data，但实际上没有数据（比如搜索无结果）
      return (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          className={className}
        />
      )
    }
    
    // 有数据，渲染子组件
    return <>{children}</>
  }
  
  // 默认返回 Loading
  return <Loading text={loadingText} size={loadingSize} className={className} />
} 