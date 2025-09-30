"use client"

import { ReactNode } from "react"
import { LucideIcon } from "lucide-react"
import Loading from "./loading"
import FallbackPage from "./fallback-page"
import EmptyState from "./empty-state"
import type { DataStateWrapperProps } from "@/types/component.types"

export type DataViewState = "loading" | "data" | "empty" | "error"


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