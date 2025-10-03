"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import type { LoadingProps } from "@/types/component.types"


// 不同类型的骨架屏组件
const SkeletonLayouts = {
  dashboard: () => (
    <div className="space-y-6 p-6">
      {/* 统计卡片骨架 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* 图表区域骨架 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 border rounded-lg space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="p-6 border rounded-lg space-y-4">
          <Skeleton className="h-6 w-28" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),

  table: () => (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex space-x-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 border-b last:border-b-0">
            <div className="flex space-x-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-20" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),

  form: () => (
    <div className="space-y-6 p-6 max-w-2xl">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex space-x-4">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-16" />
      </div>
    </div>
  ),

  cards: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-6 border rounded-lg space-y-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  ),

  workflow: () => (
    <div className="p-6 space-y-6">
      {/* 工作流头部 */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* 工作流画布区域 */}
      <div className="border rounded-lg p-8 bg-gray-50 min-h-96">
        <div className="flex items-center justify-center space-x-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="p-4 bg-white border rounded-lg shadow-sm">
                <Skeleton className="h-12 w-32" />
              </div>
              {i < 2 && <Skeleton className="h-0.5 w-8" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Loading({
  size = "md",
  text = "加载中...",
  className,
  fullScreen = false,
  showSkeleton = false,
  skeletonType = "dashboard"
}: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  const fullScreenSizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  }

  // 如果显示骨架屏
  if (showSkeleton && !fullScreen) {
    const SkeletonComponent = SkeletonLayouts[skeletonType]
    return (
      <div className={cn("animate-pulse", className)}>
        <SkeletonComponent />
      </div>
    )
  }

  if (fullScreen) {
    return (
      <div className={cn("min-h-screen bg-background flex items-center justify-center", className)}>
        <div className="text-center space-y-4">
          <Loader2 className={cn("animate-spin text-primary mx-auto", fullScreenSizeClasses[size])} />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              {text}
            </h2>
            <p className="text-sm text-muted-foreground">请稍候，系统正在为您准备内容</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <div className="flex items-center space-x-2">
        <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
        <span className="text-muted-foreground">
          {text}
        </span>
      </div>
    </div>
  )
}
