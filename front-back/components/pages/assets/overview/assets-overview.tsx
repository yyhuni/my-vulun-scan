"use client"

import { useState } from "react"
import {
  Building2,
  Globe,
  BarChart3,
  PieChart,
  Activity,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// 示例数据
const assetStats = {
  totalOrganizations: 156,
  totalDomains: 1247,
  totalSubdomains: 8934,
  activeAssets: 1403,
  organizationGrowth: 12.5,
  domainGrowth: 8.3,
  subdomainGrowth: 15.2,
  activeGrowth: 6.7,
}

const organizationsByIndustry = [
  { industry: "科技", count: 45, percentage: 28.8 },
  { industry: "金融", count: 32, percentage: 20.5 },
  { industry: "制造业", count: 28, percentage: 17.9 },
  { industry: "医疗", count: 22, percentage: 14.1 },
  { industry: "教育", count: 18, percentage: 11.5 },
  { industry: "其他", count: 11, percentage: 7.1 },
]

const domainsByTLD = [
  { tld: ".com", count: 567, percentage: 45.5 },
  { tld: ".cn", count: 234, percentage: 18.8 },
  { tld: ".org", count: 156, percentage: 12.5 },
  { tld: ".net", count: 123, percentage: 9.9 },
  { tld: ".edu", count: 89, percentage: 7.1 },
  { tld: "其他", count: 78, percentage: 6.3 },
]

const recentAssets = [
  {
    id: "1",
    type: "organization",
    name: "新兴科技有限公司",
    CreatedAt: "2024-03-15",
    domains: 5,
  },
  {
    id: "2",
    type: "domain",
    name: "newtech.com",
    CreatedAt: "2024-03-15",
    organization: "新兴科技有限公司",
  },
  {
    id: "3",
    type: "organization",
    name: "创新医疗集团",
    CreatedAt: "2024-03-14",
    domains: 3,
  },
  {
    id: "4",
    type: "domain",
    name: "innovmed.cn",
    CreatedAt: "2024-03-14",
    organization: "创新医疗集团",
  },
  {
    id: "5",
    type: "domain",
    name: "techstart.org",
    CreatedAt: "2024-03-13",
    organization: "科技创业园",
  },
]

const assetHealth = [
  { status: "健康", count: 1156, percentage: 82.4, color: "bg-green-500" },
  { status: "警告", count: 187, percentage: 13.3, color: "bg-yellow-500" },
  { status: "错误", count: 60, percentage: 4.3, color: "bg-red-500" },
]

export default function AssetsOverview() {
  const [searchTerm, setSearchTerm] = useState("")

  const getTrendIcon = (growth: number) => {
    return growth >= 0 ? (
      <ArrowUpRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-600" />
    )
  }

  const getAssetTypeIcon = (type: string) => {
    return type === "organization" ? (
      <Building2 className="h-4 w-4 text-blue-600" />
    ) : (
      <Globe className="h-4 w-4 text-green-600" />
    )
  }

  const getAssetTypeBadge = (type: string) => {
    return type === "organization" ? (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        组织
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        域名
      </Badge>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* 头部 */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">资产概况</h1>
        <p className="text-muted-foreground">查看和管理所有资产的统计信息和概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">组织总数</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetStats.totalOrganizations}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(assetStats.organizationGrowth)}
              <span className="ml-1">
                {assetStats.organizationGrowth > 0 ? "+" : ""}
                {assetStats.organizationGrowth}% 较上月
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">域名总数</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetStats.totalDomains}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(assetStats.domainGrowth)}
              <span className="ml-1">
                {assetStats.domainGrowth > 0 ? "+" : ""}
                {assetStats.domainGrowth}% 较上月
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">子域名总数</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetStats.totalSubdomains}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(assetStats.subdomainGrowth)}
              <span className="ml-1">
                {assetStats.subdomainGrowth > 0 ? "+" : ""}
                {assetStats.subdomainGrowth}% 较上月
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃资产</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetStats.activeAssets}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(assetStats.activeGrowth)}
              <span className="ml-1">
                {assetStats.activeGrowth > 0 ? "+" : ""}
                {assetStats.activeGrowth}% 较上月
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧两列 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 组织行业分布 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>组织行业分布</CardTitle>
                <PieChart className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {organizationsByIndustry.map((item) => (
                  <div key={item.industry} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">{item.industry}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">{item.count}</span>
                      <Badge variant="outline">{item.percentage}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 域名顶级域分布 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>域名顶级域分布</CardTitle>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {domainsByTLD.map((item) => (
                  <div key={item.tld} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">{item.tld}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">{item.count}</span>
                      <Badge variant="outline">{item.percentage}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧边栏 */}
        <div className="space-y-6">
          {/* 资产健康状态 */}
          <Card>
            <CardHeader>
              <CardTitle>资产健康状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assetHealth.map((item) => (
                  <div key={item.status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.status}</span>
                      <span className="text-sm text-muted-foreground">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.percentage}%` }}></div>
                    </div>
                    <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 最近添加的资产 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>最近添加</CardTitle>
                <Button variant="outline" size="sm">
                  查看全部
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getAssetTypeIcon(asset.type)}
                      <div>
                        <div className="font-medium text-sm">{asset.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {asset.type === "organization" ? `${asset.domains} 个域名` : asset.organization}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {getAssetTypeBadge(asset.type)}
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(asset.CreatedAt).toLocaleDateString("zh-CN")}
                      </div>
                    </div>
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
                  <Plus className="h-4 w-4 mr-2" />
                  添加组织
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <Globe className="h-4 w-4 mr-2" />
                  添加域名
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  生成报告
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  高级筛选
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 搜索和筛选栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="搜索资产..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Building2 className="h-4 w-4 mr-2" />
                管理组织
              </Button>
              <Button variant="outline" size="sm">
                <Globe className="h-4 w-4 mr-2" />
                管理域名
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
