"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IconBrandGithub, IconScale, IconRefresh } from "@tabler/icons-react"
import type { Tool } from "@/types/tool.types"
import { CategoryNameMap } from "@/types/tool.types"
import Link from "next/link"

interface ToolCardProps {
  tool: Tool
  onCheckUpdate?: (toolId: number) => void
}

/**
 * 高亮描述文本组件
 * 简单显示描述文本，保持简洁
 */
function HighlightedDescription({ description }: { description: string }) {
  return <p className="line-clamp-4">{description}</p>
}

/**
 * 工具卡片组件
 * 显示单个扫描工具的信息
 */
export function ToolCard({ tool, onCheckUpdate }: ToolCardProps) {
  // 从 name 生成首字母大写的 displayName
  const displayName = tool.name.charAt(0).toUpperCase() + tool.name.slice(1)
  
  return (
    <Card className="relative flex flex-col h-full hover:shadow-lg transition-shadow">
      {/* 分类标签 */}
      {tool.categoryName && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="text-xs">
            {CategoryNameMap[tool.categoryName] || tool.categoryName}
          </Badge>
        </div>
      )}

      <CardHeader className="pt-6 pb-4">
        {/* 工具名称 */}
        <CardTitle className="text-center text-2xl font-bold">
          {displayName}
        </CardTitle>

        {/* GitHub/仓库链接 */}
        <div className="flex items-center justify-center gap-3 mt-3">
          {tool.repoUrl && (
            <Link 
              href={tool.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <IconBrandGithub className="h-4 w-4" />
              <span>Repository</span>
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        {/* 当前版本 */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2 font-medium">Current Installed Version</p>
          <p className="text-primary font-semibold text-sm">{tool.version}</p>
        </div>

        {/* 工具描述 */}
        <div className="text-sm text-muted-foreground leading-relaxed">
          <HighlightedDescription description={tool.description} />
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button 
          className="w-full"
          variant="default"
          onClick={() => onCheckUpdate?.(tool.id)}
        >
          <IconRefresh className="h-4 w-4 mr-2" />
          Check Update
        </Button>
      </CardFooter>
    </Card>
  )
}
