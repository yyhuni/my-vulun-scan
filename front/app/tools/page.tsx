"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconPlus, IconSettings } from "@tabler/icons-react"
import { ToolCard } from "@/components/tools/tool-card"
import { useTools, useCategories } from "@/hooks/use-tools"
import { CategoryNameMap } from "@/types/tool.types"

/**
 * 工具管理页面
 * 展示和管理扫描工具集
 */
export default function ToolsPage() {
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all")
  
  // 获取分类列表
  const { data: categories = [], isLoading: categoriesLoading } = useCategories()
  
  // 获取工具列表
  const { data, isLoading: toolsLoading, error } = useTools({
    page: 1,
    pageSize: 100, // 获取所有工具
    sortBy: 'name',
    sortOrder: 'asc'
  })

  const tools = data?.tools || []
  
  // 按分类筛选工具
  const filteredTools = useMemo(() => {
    if (activeCategoryId === "all") return tools
    return tools.filter(tool => tool.categoryName === activeCategoryId)
  }, [tools, activeCategoryId])
  
  const isLoading = categoriesLoading || toolsLoading

  // 处理检查更新
  const handleCheckUpdate = (toolId: number) => {
    console.log("Check update for tool:", toolId)
    // TODO: 实现检查更新逻辑
  }

  // 处理添加新工具
  const handleAddNewTool = () => {
    console.log("Add new tool")
    // TODO: 实现添加新工具逻辑
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">加载工具列表中...</p>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive">加载失败: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* 页面标题和操作栏 */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-3xl font-bold">Tool Arsenal</h1>
          <p className="text-muted-foreground mt-1">
            工具集 - 管理和配置扫描工具
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon">
            <IconSettings className="h-5 w-5" />
          </Button>
          <Button onClick={handleAddNewTool}>
            <IconPlus  />
            Add new tool
          </Button>
        </div>
      </div>

      {/* 工具筛选标签页 */}
      <div className="px-4 lg:px-6">
        <Tabs 
          defaultValue="all" 
          value={activeCategoryId}
          onValueChange={setActiveCategoryId}
          className="flex-1"
        >
          <TabsList className="mb-6">
            {/* All 标签 */}
            <TabsTrigger value="all">
              All ({tools.length})
            </TabsTrigger>
            
            {/* 动态分类标签 */}
            {categories.map((categoryName) => {
              const count = tools.filter(t => t.categoryName === categoryName).length
              return (
                <TabsTrigger key={categoryName} value={categoryName}>
                  {CategoryNameMap[categoryName] || categoryName} ({count})
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* All 标签内容 */}
          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTools.map((tool) => (
                <ToolCard 
                  key={tool.id} 
                  tool={tool}
                  onCheckUpdate={handleCheckUpdate}
                />
              ))}
            </div>
            {filteredTools.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">暂无工具</p>
              </div>
            )}
          </TabsContent>

          {/* 动态分类标签内容 */}
          {categories.map((categoryName) => (
            <TabsContent key={categoryName} value={categoryName} className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTools.map((tool) => (
                  <ToolCard 
                    key={tool.id} 
                    tool={tool}
                    onCheckUpdate={handleCheckUpdate}
                  />
                ))}
              </div>
              {filteredTools.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">该分类暂无工具</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
