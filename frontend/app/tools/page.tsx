import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PackageOpen, Settings, ArrowRight } from "lucide-react"
import Link from "next/link"

/**
 * 工具概览页面
 * 显示开源工具和自定义工具的入口
 */
export default function ToolsPage() {
  // 功能模块
  const modules = [
    {
      title: "开源工具",
      description: "管理和配置开源扫描工具，支持自动更新和版本管理",
      href: "/tools/config/opensource",
      icon: PackageOpen,
      status: "available",
      stats: {
        total: "12",
        active: "8"
      }
    },
    {
      title: "自定义工具",
      description: "管理自定义扫描脚本和工具，支持命令配置和参数管理",
      href: "/tools/config/custom",
      icon: Settings,
      status: "available",
      stats: {
        total: "5",
        active: "3"
      }
    }
  ]

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">工具</h2>
          <p className="text-muted-foreground">
            管理和配置扫描工具，包括开源工具和自定义工具
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="px-4 lg:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((module) => (
            <Card key={module.title} className="relative hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <module.icon className="h-5 w-5" />
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                  </div>
                  {module.status === "coming-soon" && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      即将上线
                    </span>
                  )}
                </div>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 统计信息 */}
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">总数：</span>
                      <span className="font-semibold ml-1">{module.stats.total}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">活跃：</span>
                      <span className="font-semibold ml-1 text-green-600">{module.stats.active}</span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  {module.status === "available" ? (
                    <Link href={module.href}>
                      <Button className="w-full">
                        进入管理
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled className="w-full">
                      敬请期待
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 快速操作 */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>
              常用的工具操作
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Link href="/tools/config/opensource">
                <Button variant="outline" size="sm">
                  <PackageOpen className="h-4 w-4" />
                  开源工具
                </Button>
              </Link>
              <Link href="/tools/config/custom">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                  自定义工具
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
