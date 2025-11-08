"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconFlask, IconLoader, IconComponents, IconPlayerPlay } from "@tabler/icons-react"

export default function TestCenterPage() {
  const testPages = [
    {
      title: "骨架屏测试",
      description: "测试 Skeleton、Loading 和 Toast 组件的各种效果",
      icon: IconLoader,
      href: "/test/skeleton/",
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "SSE 执行",
      description: "测试服务器推送事件（Server-Sent Events）的实时数据流",
      icon: IconPlayerPlay,
      href: "/test/sse-execution/",
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "组件展示",
      description: "展示项目中所有 shadcn/ui 组件的完整样式和交互",
      icon: IconComponents,
      href: "/test/components-showcase/",
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
  ]

  return (
    <div className="container mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <IconFlask className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">测试中心</h1>
            <p className="text-muted-foreground">组件测试、功能演示和调试工具</p>
          </div>
        </div>
      </div>

      {/* Test Pages Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testPages.map((page) => (
          <Card key={page.href} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className={`w-12 h-12 rounded-lg ${page.bgColor} flex items-center justify-center mb-4`}>
                <page.icon className={`h-6 w-6 ${page.color}`} />
              </div>
              <CardTitle>{page.title}</CardTitle>
              <CardDescription>{page.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href={page.href}>
                  进入测试
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>关于测试中心</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold mb-2">骨架屏测试</h4>
              <p className="text-sm text-muted-foreground">
                包含 LoadingSpinner、LoadingState、LoadingOverlay、Skeleton 和 Toast 组件的完整测试用例。
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">SSE 执行</h4>
              <p className="text-sm text-muted-foreground">
                测试实时命令执行和服务器推送事件，查看实时日志输出和状态更新。
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">组件展示</h4>
              <p className="text-sm text-muted-foreground">
                展示所有 UI 组件的样式、变体和交互效果，方便开发和调试。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
