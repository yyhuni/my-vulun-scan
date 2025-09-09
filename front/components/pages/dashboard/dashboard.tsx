"use client"

import { useState, useEffect } from "react"
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Building2,
  Globe,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

// 动态数据生成
const defaultKpiData = {
  totalOrganizations: 0,
  totalDomains: 0,
  activeScanTasks: 0,
  securityAlerts: 0,
  organizationGrowth: "0.0",
  domainGrowth: "0.0",
  scanGrowth: "0.0",
  alertGrowth: "0.0",
};

const generateKpiData = () => ({
  totalOrganizations: 156 + Math.floor(Math.random() * 10),
  totalDomains: 1247 + Math.floor(Math.random() * 50),
  activeScanTasks: 15 + Math.floor(Math.random() * 20),
  securityAlerts: 5 + Math.floor(Math.random() * 10),
  organizationGrowth: (Math.random() * 20 - 5).toFixed(1),
  domainGrowth: (Math.random() * 15 - 2).toFixed(1),
  scanGrowth: (Math.random() * 10 - 5).toFixed(1),
  alertGrowth: (Math.random() * 25 - 10).toFixed(1),
})

const generateRecentScans = () => {
  const domains = ["example.com", "alibaba.com", "tencent.com", "baidu.com", "bytedance.com"]
  const organizations = ["华为技术有限公司", "阿里巴巴集团", "腾讯科技", "百度在线", "字节跳动"]
  const statuses = ["completed", "running", "failed", "pending"]

  return Array.from({ length: 6 }, (_, index) => ({
    id: `SCAN-${String(index + 1).padStart(3, "0")}`,
    domain: domains[index % domains.length],
    organization: organizations[index % organizations.length],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    startTime: new Date(Date.now() - Math.random() * 86400000).toLocaleString("zh-CN"),
    duration: Math.random() > 0.3 ? `${Math.floor(Math.random() * 300) + 30}秒` : "进行中",
    findings: Math.floor(Math.random() * 20),
  }))
}

const generateSecurityAlerts = () => {
  const types = ["high", "medium", "low", "info"]
  const titles = [
    "发现高危漏洞",
    "SSL证书即将过期",
    "新子域名发现",
    "端口扫描异常",
    "DNS配置问题",
    "安全证书更新",
    "异常访问检测",
    "服务器响应异常",
  ]
  const domains = ["example.com", "test.com", "alibaba.com", "demo.org"]

  return Array.from({ length: 4 }, (_, index) => ({
    id: `ALERT-${String(index + 1).padStart(3, "0")}`,
    type: types[Math.floor(Math.random() * types.length)],
    title: titles[Math.floor(Math.random() * titles.length)],
    domain: domains[Math.floor(Math.random() * domains.length)],
    description: "这是一个模拟的安全警报描述信息",
    time: `${Math.floor(Math.random() * 12) + 1}小时前`,
  }))
}

export default function EnhancedDashboard() {
  const { toast } = useToast()
  const [kpiData, setKpiData] = useState<ReturnType<typeof generateKpiData> | null>(null);
  const [recentScans, setRecentScans] = useState<ReturnType<typeof generateRecentScans> | null>(null);
  const [securityAlerts, setSecurityAlerts] = useState<ReturnType<typeof generateSecurityAlerts> | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true);

  const systemStatus = [
    { name: "扫描引擎", status: "online", uptime: "99.9%" },
    { name: "数据库", status: "online", uptime: "99.8%" },
    { name: "API服务", status: "online", uptime: "99.7%" },
    { name: "通知服务", status: Math.random() > 0.8 ? "maintenance" : "online", uptime: "95.2%" },
  ]

  // 自动刷新数据
  useEffect(() => {
    // 在客户端加载后生成初始数据
    setKpiData(generateKpiData());
    setRecentScans(generateRecentScans());
    setSecurityAlerts(generateSecurityAlerts());
    setLastUpdated(new Date());
    setLoading(false);

    const interval = setInterval(() => {
      setKpiData(generateKpiData())
      setRecentScans(generateRecentScans())
      setSecurityAlerts(generateSecurityAlerts())
      setLastUpdated(new Date())
    }, 30000) // 30秒刷新一次

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)

    // 模拟API调用延迟
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setKpiData(generateKpiData())
    setRecentScans(generateRecentScans())
    setSecurityAlerts(generateSecurityAlerts())
    setLastUpdated(new Date())
    setIsRefreshing(false)

    toast({
      title: "刷新成功",
      description: "仪表盘数据已更新",
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "running":
        return <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            已完成
          </Badge>
        )
      case "running":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            进行中
          </Badge>
        )
      case "failed":
        return <Badge variant="destructive">失败</Badge>
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            等待中
          </Badge>
        )
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getAlertBadge = (type: string) => {
    switch (type) {
      case "high":
        return <Badge variant="destructive">高危</Badge>
      case "medium":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            中危
          </Badge>
        )
      case "low":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            低危
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            信息
          </Badge>
        )
    }
  }

  const getSystemStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            在线
          </Badge>
        )
      case "maintenance":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            维护中
          </Badge>
        )
      case "offline":
        return <Badge variant="destructive">离线</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getTrendIcon = (growth: number) => {
    return growth >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
          <p className="text-muted-foreground">系统概览和关键指标监控</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">最后更新: {lastUpdated ? lastUpdated.toLocaleTimeString("zh-CN") : "-"}</span>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
        {/* KPI 卡片 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">组织总数</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {kpiData ? (
                <>
                  <div className="text-2xl font-bold">{kpiData.totalOrganizations}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {getTrendIcon(Number.parseFloat(kpiData.organizationGrowth))}
                    <span className="ml-1">
                      {Number.parseFloat(kpiData.organizationGrowth) > 0 ? "+" : ""}
                      {kpiData.organizationGrowth}% 较上周
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="h-7 w-24 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">域名总数</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {kpiData ? (
                <>
                  <div className="text-2xl font-bold">{kpiData.totalDomains}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {getTrendIcon(Number.parseFloat(kpiData.domainGrowth))}
                    <span className="ml-1">
                      {Number.parseFloat(kpiData.domainGrowth) > 0 ? "+" : ""}
                      {kpiData.domainGrowth}% 较上周
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="h-7 w-24 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活跃扫描</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {kpiData ? (
                <>
                  <div className="text-2xl font-bold">{kpiData.activeScanTasks}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {getTrendIcon(Number.parseFloat(kpiData.scanGrowth))}
                    <span className="ml-1">
                      {Number.parseFloat(kpiData.scanGrowth) > 0 ? "+" : ""}
                      {kpiData.scanGrowth}% 较上周
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="h-7 w-24 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">安全警报</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {kpiData ? (
                <>
                  <div className="text-2xl font-bold">{kpiData.securityAlerts}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {getTrendIcon(Number.parseFloat(kpiData.alertGrowth))}
                    <span className="ml-1">
                      {Number.parseFloat(kpiData.alertGrowth) > 0 ? "+" : ""}
                      {kpiData.alertGrowth}% 较上周
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="h-7 w-24 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 主要内容区域 */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* 最近扫描 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>最近扫描</CardTitle>
                  <Button variant="outline" size="sm">
                    查看全部
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentScans ? (
                    recentScans.map((scan) => (
                      <div
                        key={scan.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(scan.status)}
                          <div>
                            <div className="font-medium">{scan.domain}</div>
                            <div className="text-sm text-muted-foreground">{scan.organization}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-sm">{scan.startTime}</div>
                            <div className="text-xs text-muted-foreground">{scan.duration}</div>
                          </div>
                          {scan.findings > 0 && <Badge variant="secondary">{scan.findings} 发现</Badge>}
                          {getStatusBadge(scan.status)}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                查看详情
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  ) : (
                    Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="h-5 w-5 bg-slate-200 rounded-full animate-pulse"></div>
                          <div className="space-y-1">
                            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                            <div className="h-3 w-40 bg-slate-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div>
                          <div className="h-3 w-24 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧边栏 */}
          <div className="space-y-6">
            {/* 安全警报 */}
            <Card>
              <CardHeader>
                <CardTitle>安全警报</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {securityAlerts ? (
                    securityAlerts.map((alert) => (
                      <div key={alert.id} className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-sm">{alert.title}</div>
                          {getAlertBadge(alert.type)}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">{alert.domain}</div>
                        <div className="text-xs text-muted-foreground mb-2">{alert.description}</div>
                        <div className="text-xs text-muted-foreground">{alert.time}</div>
                      </div>
                    ))
                  ) : (
                    Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="h-5 w-12 bg-slate-200 rounded animate-pulse"></div>
                            <div className="h-4 w-48 bg-slate-200 rounded animate-pulse"></div>
                          </div>
                          <div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                        <div className="h-4 w-full bg-slate-200 rounded animate-pulse"></div>
                      </div>
                    ))
                  )}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  查看所有警报
                </Button>
              </CardContent>
            </Card>

            {/* 系统状态 */}
            <Card>
              <CardHeader>
                <CardTitle>系统状态</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemStatus.map((service) => (
                    <div key={service.name} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{service.name}</div>
                        <div className="text-xs text-muted-foreground">运行时间: {service.uptime}</div>
                      </div>
                      {getSystemStatusBadge(service.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 快速操作 */}
            <Card>
              <CardHeader>
                <CardTitle>快速操作</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button className="w-full" size="sm">
                    <Zap className="h-4 w-4 mr-2" />
                    开始新扫描
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <Building2 className="h-4 w-4 mr-2" />
                    添加组织
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <Globe className="h-4 w-4 mr-2" />
                    添加域名
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    查看报告
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </>
      )}
    </div>
  )
}
