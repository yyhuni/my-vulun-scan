"use client"

// React 核心库
import { useState, useEffect, useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"

// 第三方库和 API 客户端
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/api-client"
import { OrganizationService } from "@/services/organization.service"

// UI 图标库
import { Globe, Loader2, CheckCircle, XCircle, Clock, AlertCircle, Eye, Plus, Trash2 } from "lucide-react"

// UI 组件库
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTable } from "@/components/custom-ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/custom-ui/data-table/data-table-column-header"

// 业务组件
import { AddSubDomainDialog } from "./add-subdomain-dialog"

// 类型定义
interface SubDomain {
  id: string
  name?: string // 兼容旧字段名
  subDomainName: string // 前端使用 camelCase
  mainDomainId: string // 前端使用 camelCase
  status: string
  createdAt: string // 前端使用 camelCase
  updatedAt: string // 前端使用 camelCase
  mainDomain?: {
    id: string
    name?: string // 兼容旧字段名
    mainDomainName: string // 前端使用 camelCase
    createdAt: string // 前端使用 camelCase
  }
}

interface MainDomain {
  id: string
  name?: string // 兼容旧字段名
  mainDomainName: string // 前端使用 camelCase
  createdAt: string // 前端使用 camelCase
}

interface OrganizationSubDomainsProps {
  organizationId: string
}



type ViewState = "loading" | "data" | "empty" | "error"
type StatusFilter = "all" | "active" | "inactive" | "unknown"



export default function OrganizationSubDomains({ organizationId }: OrganizationSubDomainsProps) {
  const [subDomains, setSubDomains] = useState<SubDomain[]>([])
  const [mainDomains, setMainDomains] = useState<MainDomain[]>([])
  const [error, setError] = useState<string | null>(null)
  const [viewState, setViewState] = useState<ViewState>("loading")
  const [isAddSubDomainDialogOpen, setIsAddSubDomainDialogOpen] = useState(false)
  const [organizationName, setOrganizationName] = useState("")
  const [selectedCount, setSelectedCount] = useState(0)

  // 辅助函数
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">活跃</Badge>
      case "inactive":
        return <Badge variant="secondary">非活跃</Badge>
      case "unknown":
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  // 列定义
  const columns = useMemo<ColumnDef<SubDomain>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "subDomainName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="子域名" />
      ),
      cell: ({ row }) => (
        <div className="font-medium max-w-[200px] truncate">
          {row.original.name || row.original.subDomainName}
        </div>
      ),
    },
    {
      accessorKey: "mainDomain",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="所属主域名" />
      ),
      cell: ({ row }) => {
        const mainDomain = row.original.mainDomain
        return mainDomain ? (
          <div className="font-medium">{mainDomain.name || mainDomain.mainDomainName}</div>
        ) : (
          <span className="text-muted-foreground">未知</span>
        )
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="状态" />
      ),
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="创建时间" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.getValue("createdAt"))}
        </span>
      ),
      meta: {
        className: "hidden sm:table-cell",
      },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="更新时间" />
      ),
      cell: ({ row }) => {
        const updatedAt = row.getValue("updatedAt") as string
        return (
          <span className="text-sm text-muted-foreground">
            {updatedAt && updatedAt !== '0001-01-01T00:00:00Z'
              ? formatDate(updatedAt)
              : '-'
            }
          </span>
        )
      },
      meta: {
        className: "hidden lg:table-cell",
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">操作</div>,
      cell: ({ row }) => (
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ], [])

  // 过滤后的子域名数据（基本过滤，详细搜索由 DataTable 处理）
  const filteredSubDomains = subDomains

  // 批量操作处理函数
  const handleBulkDelete = () => {
    if (selectedCount === 0) {
      // 这里可以显示提示信息，比如使用 toast
      console.log("请先选择要删除的子域名")
      return
    }

    // 这里可以实现批量删除逻辑
    console.log(`批量删除 ${selectedCount} 个子域名`)
  }

  // 获取组织信息
  const fetchOrganizationInfo = async () => {
    if (!organizationId) return

    try {
      // 使用组织服务
      const response = await OrganizationService.getOrganization(organizationId)

      if (response.code === "SUCCESS" && response.data) {
        setOrganizationName(response.data.name || "")
      }
    } catch (error: any) {
      console.error("获取组织信息出错:", error)
    }
  }

  // 获取组织的主域名列表
  const fetchMainDomains = async () => {
    if (!organizationId) return

    try {
      // 使用组织服务
      const response = await OrganizationService.getOrganizationMainDomains(organizationId)

      if (response.code === "SUCCESS" && response.data) {
        // 数据已经自动转换为 camelCase，无需手动转换
        const domains = response.data.mainDomains || []
        setMainDomains(domains)
        // 主域名获取成功
      } else {
        // 主域名 API 响应异常
      }
    } catch (error: any) {
      console.error("获取主域名出错:", error)
      // 如果 API 不存在，我们可以尝试从组织概览中获取主域名信息
      // 或者暂时使用模拟数据进行测试
      // 使用模拟主域名数据进行测试
      setMainDomains([
        { id: "mock-1", name: "example.com", mainDomainName: "example.com", createdAt: new Date().toISOString() },
        { id: "mock-2", name: "test.com", mainDomainName: "test.com", createdAt: new Date().toISOString() }
      ])
    }
  }

  // 获取组织的子域名列表
  const fetchSubDomains = async (page: number = 1, pageSize: number = 10) => {
    if (!organizationId) return

    try {
      setViewState("loading")
      setError(null)

      // 使用组织服务
      const response = await OrganizationService.getOrganizationSubDomains(organizationId, {
        page, pageSize
      })

      if (response.code === "SUCCESS" && response.data) {
        const data = response.data
        // 数据已经自动转换为 camelCase，无需手动转换
        const subDomains = data.subDomains || []
        setSubDomains(subDomains)
        setViewState(subDomains.length > 0 ? "data" : "empty")
      } else {
        throw new Error(response.message || "获取子域名失败")
      }
    } catch (error: any) {
      console.error("获取组织子域名出错:", error)
      const errorMessage = getErrorMessage(error)
      setError(errorMessage)
      toast.error(errorMessage)
      setSubDomains([])
      setViewState("error")
    }
  }


  // 处理添加子域名
  const handleAddSubDomain = async (subdomains: { name: string; mainDomainId: string }[]) => {
    try {
      // 按主域名分组子域名
      const groupedByMainDomain = subdomains.reduce((acc, subdomain) => {
        if (!acc[subdomain.mainDomainId]) {
          acc[subdomain.mainDomainId] = []
        }
        acc[subdomain.mainDomainId].push(subdomain.name)
        return acc
      }, {} as Record<string, string[]>)

      // 为每个主域名批量创建子域名
      for (const [mainDomainId, subDomainNames] of Object.entries(groupedByMainDomain)) {
        // 使用组织服务
        const response = await OrganizationService.createSubDomains({
          subDomains: subDomainNames,    // 前端使用 camelCase，会自动转换为 sub_domains
          mainDomainId: mainDomainId,    // 前端使用 camelCase，会自动转换为 main_domain_id
          status: "unknown" // 默认状态
        })

        if (response.code !== "SUCCESS") {
          throw new Error(response.message || "添加子域名失败")
        }
      }

      toast.success(`成功添加 ${subdomains.length} 个子域名`)
      setIsAddSubDomainDialogOpen(false)

      // 重新获取子域名列表
      fetchSubDomains()
    } catch (error: any) {
      console.error("添加子域名出错:", error)
      toast.error(getErrorMessage(error))
    }
  }

  // 组件挂载时获取数据
  useEffect(() => {
    fetchOrganizationInfo()
    fetchMainDomains()
    fetchSubDomains()
  }, [organizationId])

  // 重试函数
  const handleRetry = () => {
    fetchSubDomains()
  }

  // 状态组件
  const LoadingState = () => (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-muted-foreground">正在加载子域名数据...</span>
      </div>
    </div>
  )

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-muted p-3 mb-4">
        <Globe className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">未找到子域名</h3>
      <p className="text-muted-foreground text-center mb-4">
        该组织暂无子域名数据
      </p>
    </div>
  )

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-destructive/10 p-3 mb-4">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-2">出现错误</h3>
      <p className="text-muted-foreground text-center mb-4">{error || "无法加载子域名数据，请重试。"}</p>
      <Button variant="outline" onClick={handleRetry}>
        重新尝试
      </Button>
    </div>
  )


  return (
    <div className="space-y-6 pb-8">
      {/* 头部统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">总子域名数</p>
                <p className="text-xl font-bold">{subDomains.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">活跃子域名</p>
                <p className="text-xl font-bold">
                  {subDomains.filter(s => s.status === "active").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-3 h-3 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">非活跃子域名</p>
                <p className="text-xl font-bold">
                  {subDomains.filter(s => s.status === "inactive").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                <Clock className="w-3 h-3 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">未知状态</p>
                <p className="text-xl font-bold">
                  {subDomains.filter(s => s.status === "unknown").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* 主要内容 - 使用 DataTable */}
      {viewState === "loading" ? (
        <LoadingState />
      ) : viewState === "empty" ? (
        <EmptyState />
      ) : viewState === "error" ? (
        <ErrorState />
      ) : (
        <DataTable
          columns={columns}
          data={filteredSubDomains}
          searchableColumns={['subDomainName']}
          filterableColumns={[
            {
              key: 'status',
              title: '状态',
              options: [
                { label: '活跃', value: 'active' },
                { label: '非活跃', value: 'inactive' },
                { label: '未知', value: 'unknown' },
              ]
            }
          ]}
          extraButtons={
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                disabled={selectedCount === 0}
                className={selectedCount === 0 ? "text-muted-foreground" : "text-destructive hover:text-destructive"}
              >
                <Trash2 />
                批量删除
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddSubDomainDialogOpen(true)}
              >
                <Plus />
                添加子域名
              </Button>
            </div>
          }
          onSelectionChange={(count) => setSelectedCount(count)}
        />
      )}

      {/* 添加子域名对话框 */}
      <AddSubDomainDialog
        isOpen={isAddSubDomainDialogOpen}
        onClose={() => setIsAddSubDomainDialogOpen(false)}
        organizationName={organizationName}
        mainDomains={mainDomains.map(domain => ({
          id: domain.id,
          name: domain.name || domain.mainDomainName || ''
        }))}
        onAddSubDomain={handleAddSubDomain}
      />
    </div>
  )
}