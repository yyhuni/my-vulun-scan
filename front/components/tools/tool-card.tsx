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
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardHeader className=" space-y-2">
        {/* 工具名称 */}
        <CardTitle className="text-center text-2xl font-bold">
          {displayName}
        </CardTitle>

        {/* GitHub/仓库链接 */}
        <div className="flex items-center justify-center">
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

        {/* 分类标签（居中显示，超出显示省略号）*/}
        {tool.categoryNames && tool.categoryNames.length > 0 && (
          <div className="flex items-center justify-center pt-1">
            <div className="flex flex-wrap gap-1 justify-center max-w-full">
              {tool.categoryNames.slice(0, 3).map((categoryName) => (
                <Badge key={categoryName} variant="secondary" className="text-xs whitespace-nowrap">
                  {CategoryNameMap[categoryName] || categoryName}
                </Badge>
              ))}
              {tool.categoryNames.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  ...
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {/* 当前安装版本 */}
        <div className="mb-2">
          <div className="text-xs text-muted-foreground text-center mb-1">
            Current Installed Version
          </div>
          <div className="text-center font-semibold text-base">
            {tool.version || 'N/A'}
          </div>
        </div>

        {/* 工具描述 */}
        <CardDescription className="flex-1 text-center line-clamp-3 text-sm leading-snug">
          {tool.description || 'No description available'}
        </CardDescription>
      </CardContent>

      <CardFooter >
        <Button
          variant="default"
          className="w-full"
          onClick={() => onCheckUpdate?.(tool.id)}
        >
          <IconRefresh/>
          Check Update
        </Button>
      </CardFooter>
    </Card>
  )
}
