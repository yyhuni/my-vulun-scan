// 导入必要的组件和图标
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, Server, Shield, ArrowRight } from "lucide-react"
import Link from "next/link"

/**
 * 资产管理概览页面
 * 显示资产管理的各个模块入口和统计信息
 */
export default function AssetsOverviewPage() {
  // 模拟统计数据
  const stats = [
    {
      title: "组织总数",
      value: "12",
      description: "系统中的组织数量",
      icon: Building2,
      trend: "+2 本月",
    },
    {
      title: "用户总数", 
      value: "248",
      description: "活跃用户数量",
      icon: Users,
      trend: "+15 本月",
    },
    {
      title: "资产设备",
      value: "156",
      description: "管理的设备数量", 
      icon: Server,
      trend: "+8 本月",
    },
    {
      title: "安全事件",
      value: "3",
      description: "待处理安全事件",
      icon: Shield,
      trend: "-2 本周",
    },
  ]

  // 功能模块
  const modules = [
    {
      title: "组织管理",
      description: "管理系统中的组织结构和信息",
      href: "/assets/organization",
      icon: Building2,
      status: "available",
    },
    {
      title: "用户管理",
      description: "管理用户账户和权限设置",
      href: "/assets/users",
      icon: Users,
      status: "coming-soon",
    },
    {
      title: "设备管理", 
      description: "管理和监控系统设备状态",
      href: "/assets/devices",
      icon: Server,
      status: "coming-soon",
    },
    {
      title: "安全管理",
      description: "安全策略和事件管理",
      href: "/assets/security",
      icon: Shield,
      status: "coming-soon",
    },
  ]

  return (
    // 内容区域
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">资产管理</h2>
          <p className="text-muted-foreground">
            管理和监控系统中的各类资产信息
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="px-4 lg:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 功能模块 */}
      <div className="px-4 lg:px-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">功能模块</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((module) => (
              <Card key={module.title} className="relative">
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
                  {module.status === "available" ? (
                    <Link href={module.href}>
                      <Button className="w-full">
                        进入管理
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled className="w-full">
                      敬请期待
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>
              常用的资产管理操作
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Link href="/assets/organization">
                <Button variant="outline" size="sm">
                  <Building2 className="h-4 w-4 mr-2" />
                  管理组织
                </Button>
              </Link>
              <Button variant="outline" size="sm" disabled>
                <Users className="h-4 w-4 mr-2" />
                添加用户
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Server className="h-4 w-4 mr-2" />
                设备监控
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Shield className="h-4 w-4 mr-2" />
                安全检查
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
