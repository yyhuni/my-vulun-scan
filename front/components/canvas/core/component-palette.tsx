// 组件库 - 显示可用的工作流组件
// 用户可以从这里拖拽组件到画布上创建节点

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronRight, ChevronLeft, Loader2, Expand, Minimize2, Search, Package, Play, Square, Settings, PanelLeftClose, PanelLeftOpen, ChevronsRightLeft, ChevronsLeftRight } from 'lucide-react'
import { useWorkflowComponents } from '@/components/canvas/hooks/use-workflow-components'

export interface ToolLibraryProps {
  selectedCategory?: string
}

interface WorkflowComponent {
  id: string
  name: string
  description: string
  category?: string
}

// 基本组件配置（静态）
const BASIC_COMPONENTS: WorkflowComponent[] = [
  { id: 'start', name: '开始', description: '工作流开始节点' },
  { id: 'end', name: '结束', description: '工作流结束节点' },
]

export function ToolLibrary(props: ToolLibraryProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'info_gathering', 'network']))
  const [searchTerm, setSearchTerm] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // 使用 hook 获取组件数据
  const { components: customComponents, isLoading, error } = useWorkflowComponents()

  // 状态持久化
  useEffect(() => {
    const saved = localStorage.getItem('toolLibraryCollapsed')
    if (saved) setIsCollapsed(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('toolLibraryCollapsed', JSON.stringify(isCollapsed))
  }, [isCollapsed])

  // 折叠切换函数
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  // 搜索时自动展开有结果的分类
  useEffect(() => {
    if (searchTerm.trim()) {
      const filteredSections = getFilteredSections()
      const sectionsWithResults = Object.keys(filteredSections)
      setExpandedSections(new Set(sectionsWithResults))
    }
  }, [searchTerm])

  // 动态创建组件分类
  const getComponentSections = () => {
    const sections: Record<string, { name: string; items: any[]; icon?: string }> = {
      basic: {
        name: '基本组件',
        items: BASIC_COMPONENTS,
        icon: '🔧'
      }
    }

    // 根据自定义组件的 category 动态创建分类
    const categoryMap: Record<string, { name: string; icon: string }> = {
      'info_gathering': { name: '信息收集', icon: '🔍' },
      'network': { name: '网络扫描', icon: '🌐' },
      'vulnerability': { name: '漏洞扫描', icon: '🛡️' },
      'web': { name: 'Web扫描', icon: '🌍' },
      'scan': { name: '扫描工具', icon: '🔎' },
      'database': { name: '数据库安全', icon: '🗄️' },
      'crypto': { name: '密码学工具', icon: '🔐' },
      'forensics': { name: '取证分析', icon: '🔬' },
      'exploit': { name: '渗透测试', icon: '⚡' },
      'custom': { name: '自定义工具', icon: '🛠️' },
      'other': { name: '其他工具', icon: '📦' }
    }

    // 按分类分组自定义组件
    const componentsByCategory: Record<string, any[]> = {}
    
    customComponents.forEach((comp: WorkflowComponent) => {
      // 将中文分类映射到英文键
      let categoryKey = 'other'
      const categoryLower = (comp.category || '').toLowerCase()
      
             // 中文分类映射 - 更精确的匹配
       if (categoryLower.includes('信息收集') || categoryLower.includes('信息') || categoryLower.includes('收集')) {
         categoryKey = 'info_gathering'
       } else if (categoryLower.includes('网络扫描') || categoryLower.includes('网络')) {
         categoryKey = 'network'
       } else if (categoryLower.includes('漏洞扫描') || categoryLower.includes('漏洞')) {
         categoryKey = 'vulnerability'
       } else if (categoryLower.includes('web扫描') || categoryLower.includes('web')) {
         categoryKey = 'web'
       } else if (categoryLower.includes('数据库') || categoryLower.includes('database')) {
         categoryKey = 'database'
       } else if (categoryLower.includes('密码') || categoryLower.includes('crypto')) {
         categoryKey = 'crypto'
       } else if (categoryLower.includes('取证') || categoryLower.includes('forensics')) {
         categoryKey = 'forensics'
       } else if (categoryLower.includes('渗透') || categoryLower.includes('exploit')) {
         categoryKey = 'exploit'
       } else if (categoryLower.includes('扫描') || categoryLower.includes('scan')) {
         categoryKey = 'scan'
       } else if (comp.category) {
         // 如果有分类但不匹配预定义的，使用原始分类作为键
         categoryKey = comp.category.toLowerCase().replace(/\s+/g, '_')
       }
      
      if (!componentsByCategory[categoryKey]) {
        componentsByCategory[categoryKey] = []
      }
      componentsByCategory[categoryKey].push({
        id: comp.id,
        name: comp.name,
        description: comp.description,
        category: comp.category
      })
    })

    // 为每个有组件的分类创建 section
    Object.entries(componentsByCategory).forEach(([categoryKey, items]) => {
      const categoryInfo = categoryMap[categoryKey] || {
        // 如果不在预定义映射中，使用原始分类名称
        name: items[0]?.category || '其他工具',
        icon: '📦'
      }
      sections[categoryKey] = {
        name: categoryInfo.name,
        items: items,
        icon: categoryInfo.icon
      }
    })

    return sections
  }

  // 过滤组件（搜索功能）
  const getFilteredSections = () => {
    const sections = getComponentSections()
    
    if (!searchTerm.trim()) {
      return sections
    }
    
    const filteredSections: typeof sections = {}
    const searchLower = searchTerm.toLowerCase()
    
    Object.entries(sections).forEach(([sectionId, section]) => {
      const filteredItems = section.items.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      )
      
      if (filteredItems.length > 0) {
        filteredSections[sectionId] = {
          ...section,
          items: filteredItems
        }
      }
    })
    
    return filteredSections
  }

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  // 全部展开/收起功能
  const toggleAllSections = () => {
    const sections = getComponentSections()
    const allSectionIds = Object.keys(sections)
    const allExpanded = allSectionIds.every(id => expandedSections.has(id))
    
    if (allExpanded) {
      // 全部收起
      setExpandedSections(new Set())
    } else {
      // 全部展开
      setExpandedSections(new Set(allSectionIds))
    }
  }



  // 创建自定义拖拽图像
  const createDragImage = (toolName: string) => {
    const dragElement = document.createElement('div')
    dragElement.style.position = 'absolute'
    dragElement.style.top = '-1000px'
    dragElement.style.left = '-1000px'
    dragElement.style.padding = '8px 12px'
    dragElement.style.backgroundColor = '#3b82f6'
    dragElement.style.color = 'white'
    dragElement.style.borderRadius = '6px'
    dragElement.style.fontSize = '12px'
    dragElement.style.fontWeight = '500'
    dragElement.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    dragElement.style.zIndex = '9999'
    dragElement.textContent = toolName
    
    document.body.appendChild(dragElement)
    
    // 清理函数
    const cleanup = () => {
      setTimeout(() => {
        if (document.body.contains(dragElement)) {
          document.body.removeChild(dragElement)
        }
      }, 100)
    }
    
    return { element: dragElement, cleanup }
  }

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    // 获取完整的组件信息
    const sections = getComponentSections()
    let componentData = null
    let toolName = '组件'

    for (const section of Object.values(sections)) {
      const item = section.items.find(item => item.id === itemId)
      if (item) {
        toolName = item.name
        // 如果不是基本组件（start/end），则是自定义组件
        if (itemId !== 'start' && itemId !== 'end') {
          componentData = customComponents.find((comp: WorkflowComponent) => comp.id === itemId)
        }
        break
      }
    }

    // 传递拖拽数据
    const dragData = {
      componentId: itemId,
      componentData: componentData
    }

    e.dataTransfer.setData('application/reactflow', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'move'

    // 创建自定义拖拽图像
    const { element: dragImage, cleanup } = createDragImage(toolName)
    e.dataTransfer.setDragImage(dragImage, 60, 20)

    // 在拖拽结束后清理元素
    const currentTarget = e.currentTarget
    const handleDragEnd = () => {
      cleanup()
      if (currentTarget) {
        currentTarget.removeEventListener('dragend', handleDragEnd)
      }
    }
    currentTarget.addEventListener('dragend', handleDragEnd)
  }

  const filteredSections = getFilteredSections()

  return (
    <div className={`${isCollapsed ? 'w-12' : 'w-64'} bg-white flex flex-col h-full border-r border-gray-200 transition-all duration-300 ease-in-out relative`}>
      {/* 头部 - 搜索和操作 */}
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        {isCollapsed ? (
          /* 折叠状态的头部 */
          <div className="flex flex-col items-center space-y-2">
            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-3 h-3 text-blue-600" />
            </div>
          </div>
        ) : (
          /* 展开状态的头部 */
          <>
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900 text-sm">组件库</h3>
                  {!isLoading && (
                    <Badge className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700">
                      <Package className="w-3 h-3 mr-1" />
                      {customComponents.length + BASIC_COMPONENTS.length} 个组件
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllSections}
                className="h-7 w-7 p-0 hover:bg-gray-100"
                title={expandedSections.size > 0 ? "收起全部" : "展开全部"}
              >
                {expandedSections.size > 0 ? (
                  <Minimize2 className="h-4 w-4 text-gray-600" />
                ) : (
                  <Expand className="h-4 w-4 text-gray-600" />
                )}
              </Button>
            </div>
            <div className="text-xs text-gray-600 mb-3">
              拖拽组件到画布创建节点
            </div>
          </>
        )}

        {/* 搜索框 - 仅在展开状态显示 */}
        {!isCollapsed && (
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索组件..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm bg-white border-gray-200 focus:bg-white"
            />
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {isCollapsed ? (
          /* 折叠状态的简化内容 */
          <div className="px-2 py-3 space-y-2">
            {/* 基本组件图标 */}
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 hover:bg-green-100"
                title="开始节点"
                draggable
                onDragStart={(e: React.DragEvent) => handleDragStart(e, 'start')}
              >
                <Play className="w-4 h-4 text-green-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 hover:bg-red-100"
                title="结束节点"
                draggable
                onDragStart={(e: React.DragEvent) => handleDragStart(e, 'end')}
              >
                <Square className="w-4 h-4 text-red-600" />
              </Button>
            </div>

            {/* 分隔线 */}
            <div className="border-t border-gray-200 my-2"></div>

            {/* 自定义组件图标 */}
            <div className="space-y-1">
              {customComponents.slice(0, 6).map((comp: WorkflowComponent) => (
                <Button
                  key={comp.id}
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 hover:bg-blue-100"
                  title={comp.name}
                  draggable
                  onDragStart={(e: React.DragEvent) => handleDragStart(e, comp.id)}
                >
                  <Settings className="w-4 h-4 text-blue-600" />
                </Button>
              ))}
              {customComponents.length > 6 && (
                <div className="text-center">
                  <span className="text-xs text-gray-500">+{customComponents.length - 6}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 展开状态的完整内容 */
          <div className="px-3 py-3">
            {/* 加载状态 */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                <span className="ml-2 text-sm text-gray-600">加载组件中...</span>
              </div>
            )}

            {/* 错误状态 */}
            {error && (
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-red-600 mb-2">加载失败</p>
                <p className="text-xs text-gray-500">{error}</p>
              </div>
            )}

            {/* 组件列表 */}
            {!isLoading && !error && (
              <div className="space-y-3">
                {Object.keys(filteredSections).length === 0 && searchTerm.trim() ? (
                  <div className="text-center py-8">
                    <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-1">未找到匹配的组件</p>
                    <p className="text-xs text-gray-400">尝试使用其他关键词搜索</p>
                  </div>
                ) : (
                  Object.entries(filteredSections).map(([sectionId, section]) => {
                    const isExpanded = expandedSections.has(sectionId)

                    return (
                      <div key={sectionId} className="space-y-1">
                {/* 分类头部 */}
                <Button
                  variant="ghost"
                  onClick={() => toggleSection(sectionId)}
                  className="w-full justify-start px-2 py-1.5 h-auto hover:bg-gray-100 text-xs"
                >
                  <div className="flex items-center gap-2 w-full">
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-gray-500 flex-shrink-0" />
                    )}
                    {section.icon && (
                      <span className="text-sm flex-shrink-0">{section.icon}</span>
                    )}
                    <span className="font-medium text-gray-900 flex-1 text-left">{section.name}</span>
                    <div className="flex-shrink-0">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-700">
                        {section.items.length}
                      </Badge>
                    </div>
                  </div>
                </Button>

                {/* 折叠内容 */}
                {isExpanded && (
                  <div className="ml-1 space-y-1">
                    {section.items.map((comp: WorkflowComponent) => (
                      <Card 
                        key={comp.id}
                        className="group cursor-grab active:cursor-grabbing hover:shadow-sm transition-all duration-150 hover:border-blue-200 hover:bg-blue-50/40 border border-gray-150"

                        draggable
                        onDragStart={(e: React.DragEvent) => handleDragStart(e, comp.id)}
                      >
                        <CardContent className="p-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900 text-xs group-hover:text-blue-700 transition-colors leading-tight">
                                {comp.name}
                              </h4>
                              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full group-hover:bg-blue-400 transition-colors flex-shrink-0"></div>
                            </div>
                            <p className="text-[10px] text-gray-600 leading-tight line-clamp-2">
                              {comp.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 现代化折叠按钮 - 使用专业图标 */}
      <button
        onClick={toggleCollapse}
        className={`
          absolute top-1/2 -translate-y-1/2 -right-3 z-10
          w-6 h-6 bg-white border border-gray-200 rounded-lg
          flex items-center justify-center
          hover:bg-gray-50 hover:border-gray-300 hover:shadow-lg
          active:scale-95
          transition-all duration-200 ease-out
          shadow-sm
          group
        `}
        title={isCollapsed ? "展开组件库" : "折叠组件库"}
      >
        {/* 使用双箭头图标表示折叠/展开 */}
        {isCollapsed ? (
          <ChevronsLeftRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-800 transition-colors duration-200" />
        ) : (
          <ChevronsRightLeft className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-800 transition-colors duration-200" />
        )}
      </button>
    </div>
  )
}

export default ToolLibrary 