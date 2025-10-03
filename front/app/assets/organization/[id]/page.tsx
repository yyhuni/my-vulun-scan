"use client" // 标记为客户端组件

// 导入 React 库和 Hooks
import React, { useState, useEffect, useMemo } from "react"
// 导入必要的组件
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Building2 } from "lucide-react"
import { toast } from "sonner"

// 导入资产相关组件
import { AssetDataTable } from "@/components/assets/organization/asset-data-table"
import { 
  createMainAssetColumns, 
  createSubdomainColumns, 
  createEndpointColumns 
} from "@/components/assets/organization/asset-columns"

// 资产数据类型定义
interface Asset {
  id: number
  name: string
  type: string
  status: string
  ip?: string
  domain?: string
  port?: number
  createdAt: string
  updatedAt: string
}

// 组织信息类型定义
interface Organization {
  id: number
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

/**
 * 组织详情页面
 * 显示单个组织的详细信息和相关资产
 * 
 * @param params - 路由参数，包含组织ID
 */
export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // 解包 params Promise
  const resolvedParams = React.use(params)
  // 状态管理
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [mainAssets, setMainAssets] = useState<Asset[]>([])
  const [subdomains, setSubdomains] = useState<Asset[]>([])
  const [endpoints, setEndpoints] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([])

  // 辅助函数 - 格式化日期
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "numeric", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  // 导航函数
  const navigate = (path: string) => {
    window.location.href = path
  }

  // 处理编辑资产
  const handleEditAsset = (asset: Asset) => {
    toast.info(`编辑资产功能开发中: ${asset.name}`)
  }

  // 处理删除资产
  const handleDeleteAsset = (asset: Asset) => {
    toast.info(`删除资产功能开发中: ${asset.name}`)
  }

  // 处理批量删除
  const handleBulkDelete = () => {
    if (selectedAssets.length === 0) {
      toast.error("请先选择要删除的资产")
      return
    }
    toast.info(`批量删除功能开发中，选中 ${selectedAssets.length} 个资产`)
  }

  // 处理添加主资产
  const handleAddMainAsset = () => {
    toast.info("添加主资产功能开发中")
  }

  // 处理添加子域名
  const handleAddSubdomain = () => {
    toast.info("添加子域名功能开发中")
  }

  // 处理添加端点
  const handleAddEndpoint = () => {
    toast.info("添加Endpoint功能开发中")
  }

  // 创建列定义
  const mainAssetColumns = useMemo(() =>
    createMainAssetColumns({ formatDate, navigate, handleEdit: handleEditAsset, handleDelete: handleDeleteAsset }),
    []
  )

  const subdomainColumns = useMemo(() =>
    createSubdomainColumns({ formatDate, navigate, handleEdit: handleEditAsset, handleDelete: handleDeleteAsset }),
    []
  )

  const endpointColumns = useMemo(() =>
    createEndpointColumns({ formatDate, navigate, handleEdit: handleEditAsset, handleDelete: handleDeleteAsset }),
    []
  )

  // 获取组织和资产数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // 模拟获取组织信息
        const mockOrganization: Organization = {
          id: parseInt(resolvedParams.id),
          name: "技术研发部",
          description: "负责公司技术研发和系统维护",
          createdAt: "2024-01-15T10:30:00Z",
          updatedAt: "2024-03-20T14:45:00Z"
        }

        // 模拟获取主资产数据
        const mockMainAssets: Asset[] = [
          {
            id: 1,
            name: "主服务器",
            type: "服务器",
            status: "活跃",
            ip: "192.168.1.100",
            domain: "main.example.com",
            port: 80,
            createdAt: "2024-01-15T10:30:00Z",
            updatedAt: "2024-03-20T14:45:00Z"
          },
          {
            id: 2,
            name: "数据库服务器",
            type: "服务器",
            status: "活跃",
            ip: "192.168.1.101",
            domain: "db.example.com",
            port: 3306,
            createdAt: "2024-01-16T09:15:00Z",
            updatedAt: "2024-03-19T16:20:00Z"
          },
          {
            id: 3,
            name: "Web应用",
            type: "服务器",
            status: "存在漏洞",
            ip: "192.168.1.102",
            domain: "web.example.com",
            port: 443,
            createdAt: "2024-01-17T11:00:00Z",
            updatedAt: "2024-03-18T13:30:00Z"
          }
        ]

        // 模拟获取子域名数据
        const mockSubdomains: Asset[] = [
          {
            id: 4,
            name: "api.example.com",
            type: "域名",
            status: "活跃",
            ip: "192.168.1.103",
            domain: "api.example.com",
            createdAt: "2024-01-18T08:45:00Z",
            updatedAt: "2024-03-17T12:15:00Z"
          },
          {
            id: 5,
            name: "admin.example.com",
            type: "域名",
            status: "活跃",
            ip: "192.168.1.104",
            domain: "admin.example.com",
            createdAt: "2024-01-19T14:20:00Z",
            updatedAt: "2024-03-16T10:45:00Z"
          },
          {
            id: 6,
            name: "test.example.com",
            type: "域名",
            status: "非活跃",
            ip: "192.168.1.105",
            domain: "test.example.com",
            createdAt: "2024-01-20T16:30:00Z",
            updatedAt: "2024-03-15T09:20:00Z"
          }
        ]

        // 模拟获取端点数据
        const mockEndpoints: Asset[] = [
          {
            id: 7,
            name: "/api/v1/users",
            type: "端点",
            status: "活跃",
            domain: "api.example.com",
            port: 443,
            createdAt: "2024-01-21T10:15:00Z",
            updatedAt: "2024-03-14T15:30:00Z"
          },
          {
            id: 8,
            name: "/api/v1/auth",
            type: "端点",
            status: "存在漏洞",
            domain: "api.example.com",
            port: 443,
            createdAt: "2024-01-22T12:45:00Z",
            updatedAt: "2024-03-13T11:20:00Z"
          },
          {
            id: 9,
            name: "/admin/login",
            type: "端点",
            status: "安全",
            domain: "admin.example.com",
            port: 443,
            createdAt: "2024-01-23T09:30:00Z",
            updatedAt: "2024-03-12T14:15:00Z"
          },
          {
            id: 10,
            name: "/admin/dashboard",
            type: "端点",
            status: "活跃",
            domain: "admin.example.com",
            port: 443,
            createdAt: "2024-01-24T11:20:00Z",
            updatedAt: "2024-03-11T16:45:00Z"
          }
        ]

        // 模拟API延迟
        await new Promise(resolve => setTimeout(resolve, 1000))

        setOrganization(mockOrganization)
        setMainAssets(mockMainAssets)
        setSubdomains(mockSubdomains)
        setEndpoints(mockEndpoints)
      } catch (error) {
        console.error('获取数据失败:', error)
        toast.error('获取组织数据失败')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [resolvedParams.id])

  if (loading) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">加载组织数据中...</span>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">组织不存在</h3>
            <p className="text-muted-foreground">
              未找到ID为 {resolvedParams.id} 的组织
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {organization.name}
          </h2>
          <p className="text-muted-foreground">
            {organization.description}
          </p>
        </div>
      </div>

      {/* 多标签页内容 */}
      <Tabs defaultValue="main-assets" className="w-full flex-col justify-start gap-6">
        {/* 标签页导航 */}
        <div className="flex items-center justify-between px-4 lg:px-6">
          <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
            <TabsTrigger value="main-assets">
              主资产表
              <Badge variant="secondary" className="ml-2">{mainAssets.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="subdomains">
              子域名
              <Badge variant="secondary" className="ml-2">{subdomains.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="endpoints">
              Endpoint
              <Badge variant="secondary" className="ml-2">{endpoints.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 主资产表标签页内容 */}
        <TabsContent value="main-assets" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
          <AssetDataTable
            data={mainAssets}
            columns={mainAssetColumns}
            onAddNew={handleAddMainAsset}
            onBulkDelete={handleBulkDelete}
            onSelectionChange={setSelectedAssets}
            searchPlaceholder="搜索主资产..."
            searchColumn="name"
            addButtonText="添加主资产"
          />
        </TabsContent>

        {/* 子域名标签页内容 */}
        <TabsContent value="subdomains" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
          <AssetDataTable
            data={subdomains}
            columns={subdomainColumns}
            onAddNew={handleAddSubdomain}
            onBulkDelete={handleBulkDelete}
            onSelectionChange={setSelectedAssets}
            searchPlaceholder="搜索子域名..."
            searchColumn="domain"
            addButtonText="添加子域名"
          />
        </TabsContent>

        {/* 端点标签页内容 */}
        <TabsContent value="endpoints" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
          <AssetDataTable
            data={endpoints}
            columns={endpointColumns}
            onAddNew={handleAddEndpoint}
            onBulkDelete={handleBulkDelete}
            onSelectionChange={setSelectedAssets}
            searchPlaceholder="搜索端点..."
            searchColumn="name"
            addButtonText="添加Endpoint"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
