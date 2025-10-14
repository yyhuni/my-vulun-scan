"use client"

import { Button } from "@/components/ui/button"
import { IconPlus } from "@tabler/icons-react"

/**
 * 扫描策略页面
 * 管理扫描策略配置
 */
export default function ScanStrategyPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* 页面标题和操作栏 */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-3xl font-bold">扫描策略</h1>
          <p className="text-muted-foreground mt-1">
            配置和管理扫描策略
          </p>
        </div>
        <Button>
          <IconPlus className="h-5 w-5 mr-2" />
          新建策略
        </Button>
      </div>

      {/* 页面内容 */}
      <div className="px-4 lg:px-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">扫描策略功能即将上线...</p>
        </div>
      </div>
    </div>
  )
}
