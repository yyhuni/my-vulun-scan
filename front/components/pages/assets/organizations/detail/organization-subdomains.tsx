"use client"

// React 核心库
import { useState, useEffect } from "react"

// 第三方库和 API 客户端
import { toast } from "sonner"
import { api, getErrorMessage } from "@/lib/api-client"

// UI 图标库
import { Globe, Loader2, Search, CheckCircle, XCircle, Clock, AlertCircle, Eye, Plus } from "lucide-react"

// UI 组件库
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// 业务组件
import { TablePagination } from "@/components/common/table-pagination"
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
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [viewState, setViewState] = useState<ViewState>("loading")
  const [isAddSubDomainDialogOpen, setIsAddSubDomainDialogOpen] = useState(false)
  const [organizationName, setOrganizationName] = useState("")

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

  // 筛选后的子域名数据
  const filteredSubDomains = subDomains.filter((subdomain) => {
    const matchesSearch =
      (subdomain.name || subdomain.subDomainName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (subdomain.mainDomain?.name || subdomain.mainDomain?.mainDomainName || "").toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || subdomain.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const paginatedSubDomains = filteredSubDomains.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // 获取组织信息
  const fetchOrganizationInfo = async () => {
    if (!organizationId) return

    try {
      // 使用新的 API 客户端，自动转换 snake_case 为 camelCase
      const response = await api.get(`/assets/organizations/${organizationId}`)

      if (response.data.code === "SUCCESS" && response.data.data) {
        setOrganizationName(response.data.data.name || "")
      }
    } catch (error: any) {
      console.error("获取组织信息出错:", error)
    }
  }

  // 获取组织的主域名列表
  const fetchMainDomains = async () => {
    if (!organizationId) return

    try {
      // 使用新的 API 客户端，自动转换 snake_case 为 camelCase
      const response = await api.get(`/assets/organizations/${organizationId}/main-domains`)

      if (response.data.code === "SUCCESS" && response.data.data) {
        // 数据已经自动转换为 camelCase，无需手动转换
        const domains = response.data.data.mainDomains || []
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

      // 使用新的 API 客户端，自动转换 snake_case 为 camelCase
      const response = await api.get(`/assets/organizations/${organizationId}/sub-domains`, {
        params: { page, pageSize }
      })

      if (response.data.code === "SUCCESS" && response.data.data) {
        const data = response.data.data
        // 数据已经自动转换为 camelCase，无需手动转换
        const subDomains = data.subDomains || []
        setSubDomains(subDomains)
        setViewState(subDomains.length > 0 ? "data" : "empty")
      } else {
        throw new Error(response.data.message || "获取子域名失败")
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

  // 处理分页变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (pageSize: number) => {
    setItemsPerPage(pageSize)
    setCurrentPage(1)
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
        // 使用新的统一 POST API
        const response = await api.post(`/assets/sub-domains/create`, {
          subDomains: subDomainNames,    // 前端使用 camelCase，会自动转换为 sub_domains
          mainDomainId: mainDomainId,    // 前端使用 camelCase，会自动转换为 main_domain_id
          status: "unknown" // 默认状态
        })

        if (response.data.code !== "SUCCESS") {
          throw new Error(response.data.message || "添加子域名失败")
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
        {searchTerm ? "请尝试调整搜索条件" : "该组织暂无子域名数据"}
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

  const DataTable = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-8 px-4 py-1 text-sm font-medium">子域名</TableHead>
            <TableHead className="h-8 px-4 py-1 text-sm font-medium">所属主域名</TableHead>
            <TableHead className="h-8 px-4 py-1 text-sm font-medium">状态</TableHead>
            <TableHead className="hidden sm:table-cell h-8 px-4 py-1 text-sm font-medium">创建时间</TableHead>
            <TableHead className="hidden lg:table-cell h-8 px-4 py-1 text-sm font-medium">更新时间</TableHead>
            <TableHead className="text-right h-8 px-4 py-1 text-sm font-medium">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedSubDomains.map((subDomain) => (
            <TableRow key={subDomain.id}>
              <TableCell className="font-medium max-w-[200px] truncate px-3 py-2">
                {subDomain.name || subDomain.subDomainName}
              </TableCell>
              <TableCell className="px-3 py-2">
                {subDomain.mainDomain ? (
                  <div className="font-medium">{subDomain.mainDomain.name || subDomain.mainDomain.mainDomainName}</div>
                ) : (
                  <span className="text-muted-foreground">未知</span>
                )}
              </TableCell>
              <TableCell className="px-3 py-2">{getStatusBadge(subDomain.status)}</TableCell>
              <TableCell className="hidden sm:table-cell px-3 py-2">
                <span className="text-sm text-muted-foreground">
                  {formatDate(subDomain.createdAt)}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell px-3 py-2">
                <span className="text-sm text-muted-foreground">
                  {subDomain.updatedAt && subDomain.updatedAt !== '0001-01-01T00:00:00Z'
                    ? formatDate(subDomain.updatedAt)
                    : '-'
                  }
                </span>
              </TableCell>
              <TableCell className="text-right px-3 py-2">
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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

      {/* 操作栏 */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="搜索子域名或主域名..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">活跃</SelectItem>
              <SelectItem value="inactive">非活跃</SelectItem>
              <SelectItem value="unknown">未知</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setIsAddSubDomainDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            添加子域名
          </Button>
        </div>
      </div>

      {/* 主要内容 */}
      <Card>
        <CardContent className="p-0">
          {viewState === "loading" && <LoadingState />}
          {viewState === "empty" && <EmptyState />}
          {viewState === "error" && <ErrorState />}
          {viewState === "data" && <>{filteredSubDomains.length === 0 ? <EmptyState /> : <DataTable />}</>}
        </CardContent>
      </Card>

      {/* 分页控件 */}
      {viewState === "data" && filteredSubDomains.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredSubDomains.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handlePageSizeChange}
            />
          </CardContent>
        </Card>
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