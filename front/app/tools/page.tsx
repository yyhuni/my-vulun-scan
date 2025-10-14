"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconPlus, IconSettings } from "@tabler/icons-react"
import { ToolCard } from "@/components/tools/tool-card"
import type { Tool, ToolFilter } from "@/types/tool.types"

// 模拟工具数据
const MOCK_TOOLS: Tool[] = [
  {
    id: 1,
    name: "subfinder",
    displayName: "Subfinder",
    description: "Subfinder is a subdomain discovery tool that discovers valid subdomains for websites by using passive online sources.",
    version: "v2.6.3",
    logo: "/tools/subfinder.svg",
    githubUrl: "https://github.com/projectdiscovery/subfinder",
    licenseUrl: "https://github.com/projectdiscovery/subfinder/blob/main/LICENSE",
    license: "MIT",
    isDefault: true,
    category: "subdomain",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "nuclei",
    displayName: "Nuclei",
    description: "Nuclei is used to send requests across targets based on a template that leading to zero false positives and providing fast scanning on large number of hosts. Nuclei offers scanning for a variety of protocols like TCP, DNS, HTTP, File, etc. With powerful and flexible templating, all kinds of security checks can be modeled with Nuclei.",
    version: "v3.3.0",
    logo: "/tools/nuclei.svg",
    githubUrl: "https://github.com/projectdiscovery/nuclei",
    licenseUrl: "https://github.com/projectdiscovery/nuclei/blob/main/LICENSE",
    license: "MIT",
    isDefault: true,
    category: "vulnerability",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    name: "httpx",
    displayName: "httpx",
    description: "httpx is a fast and multi-purpose HTTP toolkit allow to run multiple probers using retryablehttp library, it is designed to maintain the result reliability with increased threads.",
    version: "v1.7.1",
    logo: "/tools/httpx.svg",
    githubUrl: "https://github.com/projectdiscovery/httpx",
    licenseUrl: "https://github.com/projectdiscovery/httpx/blob/main/LICENSE",
    license: "MIT",
    isDefault: true,
    category: "http",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 4,
    name: "naabu",
    displayName: "Naabu",
    description: "Naabu is a port scanning tool written in Go that allows you to enumerate valid ports for hosts in a fast and reliable manner. It is a really simple tool that does fast SYN/CONNECT scans on the host/list of hosts and lists all ports that return a reply.",
    version: "v2.3.0",
    logo: "/tools/naabu.svg",
    githubUrl: "https://github.com/projectdiscovery/naabu",
    licenseUrl: "https://github.com/projectdiscovery/naabu/blob/main/LICENSE",
    license: "MIT",
    isDefault: true,
    category: "port-scan",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 5,
    name: "katana",
    displayName: "Katana",
    description: "A next-generation crawling and spidering framework.",
    version: "v1.0.3",
    logo: "/tools/katana.svg",
    githubUrl: "https://github.com/projectdiscovery/katana",
    licenseUrl: "https://github.com/projectdiscovery/katana/blob/main/LICENSE",
    license: "MIT",
    isDefault: true,
    category: "crawler",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 6,
    name: "alterx",
    displayName: "alterx",
    description: "Fast and customizable subdomain wordlist generator using DSL.",
    version: "v0.0.2",
    logo: "/tools/alterx.svg",
    githubUrl: "https://github.com/projectdiscovery/alterx",
    licenseUrl: "https://github.com/projectdiscovery/alterx/blob/main/LICENSE",
    license: "MIT",
    isDefault: true,
    category: "subdomain",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 7,
    name: "dnsx",
    displayName: "dnsx",
    description: "A fast and multi-purpose DNS toolkit allow to run multiple DNS queries.",
    version: "v1.2.1",
    logo: "/tools/dnsx.svg",
    githubUrl: "https://github.com/projectdiscovery/dnsx",
    licenseUrl: "https://github.com/projectdiscovery/dnsx/blob/main/LICENSE",
    license: "MIT",
    isDefault: true,
    category: "dns",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 8,
    name: "sublist3r",
    displayName: "Sublist3r",
    description: "Fast subdomains enumeration tool for penetration testers.",
    version: "v1.1",
    logo: "/tools/sublist3r.svg",
    githubUrl: "https://github.com/aboul3la/Sublist3r",
    licenseUrl: "https://github.com/aboul3la/Sublist3r/blob/master/LICENSE",
    license: "GPL-2.0",
    isDefault: true,
    category: "subdomain",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
]

/**
 * 工具管理页面
 * 展示和管理扫描工具集
 */
export default function ToolsPage() {
  const [activeFilter, setActiveFilter] = useState<ToolFilter>("all")

  // 根据过滤条件筛选工具
  const filteredTools = MOCK_TOOLS.filter((tool) => {
    if (activeFilter === "all") return true
    if (activeFilter === "default") return tool.isDefault
    if (activeFilter === "custom") return !tool.isDefault
    return true
  })

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
          value={activeFilter}
          onValueChange={(value) => setActiveFilter(value as ToolFilter)}
          className="flex-1"
        >
          <TabsList className="mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="default">Default</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

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

        <TabsContent value="default" className="mt-0">
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
              <p className="text-muted-foreground">暂无默认工具</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="custom" className="mt-0">
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
              <p className="text-muted-foreground">暂无自定义工具</p>
            </div>
          )}
        </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
