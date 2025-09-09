"use client"

import { useState } from "react"
import { Search, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Loader2, Download, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TablePagination } from "@/components/common/table-pagination"

// 模拟扫描历史数据 - 参考 mocks/handlers/scan-history-handlers.ts
const sampleScanHistory = [
  {
    id: "SCAN-001",
    type: "全面扫描",
    startTime: "2024-03-20T09:00:00Z",
    endTime: "2024-03-20T12:30:00Z",
    duration: "3小时30分钟",
    status: "已完成",
    organization: "华为技术有限公司",
    organizationId: "ORG-001",
    domainsScanned: 12,
    vulnerabilitiesFound: 24,
    highRisk: 3,
    mediumRisk: 8,
    lowRisk: 13,
    scanBy: "system",
    scanByName: "系统自动扫描",
    reportUrl: "/reports/scan-001.pdf",
    scanConfig: {
      targets: ["huawei.com", "vmall.com", "hicloud.com"],
      scanType: "comprehensive",
      includeSubdomains: true,
      portRange: "1-65535"
    },
    progress: 100
  },
  {
    id: "SCAN-002",
    type: "快速扫描",
    startTime: "2024-03-15T14:00:00Z",
    endTime: "2024-03-15T14:45:00Z",
    duration: "45分钟",
    status: "已完成",
    organization: "华为技术有限公司",
    organizationId: "ORG-001",
    domainsScanned: 12,
    vulnerabilitiesFound: 18,
    highRisk: 2,
    mediumRisk: 6,
    lowRisk: 10,
    scanBy: "admin",
    scanByName: "管理员",
    reportUrl: "/reports/scan-002.pdf",
    scanConfig: {
      targets: ["huawei.com"],
      scanType: "quick",
      includeSubdomains: false,
      portRange: "1-1024"
    },
    progress: 100
  },
  {
    id: "SCAN-003",
    type: "漏洞验证",
    startTime: "2024-03-10T16:00:00Z",
    endTime: "2024-03-10T17:15:00Z",
    duration: "1小时15分钟",
    status: "已完成",
    organization: "华为技术有限公司",
    organizationId: "ORG-001",
    domainsScanned: 4,
    vulnerabilitiesFound: 12,
    highRisk: 1,
    mediumRisk: 4,
    lowRisk: 7,
    scanBy: "security_team",
    scanByName: "安全团队",
    reportUrl: "/reports/scan-003.pdf",
    scanConfig: {
      targets: ["api.huawei.com", "admin.huawei.com"],
      scanType: "vulnerability_verification",
      includeSubdomains: true,
      portRange: "80,443,8080,8443"
    },
    progress: 100
  },
  {
    id: "SCAN-004",
    type: "全面扫描",
    startTime: "2024-03-05T10:00:00Z",
    endTime: null,
    duration: null,
    status: "失败",
    organization: "华为技术有限公司",
    organizationId: "ORG-001",
    domainsScanned: 0,
    vulnerabilitiesFound: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    scanBy: "system",
    scanByName: "系统自动扫描",
    reportUrl: null,
    error: "网络连接超时 - 目标服务器无响应",
    scanConfig: {
      targets: ["huawei.com", "vmall.com"],
      scanType: "comprehensive",
      includeSubdomains: true,
      portRange: "1-65535"
    },
    progress: 25
  },
  {
    id: "SCAN-005",
    type: "自定义扫描",
    startTime: "2024-03-01T08:30:00Z",
    endTime: "2024-03-01T11:45:00Z",
    duration: "3小时15分钟",
    status: "已完成",
    organization: "华为技术有限公司",
    organizationId: "ORG-001",
    domainsScanned: 8,
    vulnerabilitiesFound: 15,
    highRisk: 2,
    mediumRisk: 5,
    lowRisk: 8,
    scanBy: "user_001",
    scanByName: "张三",
    reportUrl: "/reports/scan-005.pdf",
    scanConfig: {
      targets: ["developer.huawei.com", "support.huawei.com"],
      scanType: "custom",
      includeSubdomains: true,
      portRange: "80,443,8080",
      customRules: ["SQL注入检测", "XSS检测", "文件上传漏洞"]
    },
    progress: 100
  },
  {
    id: "SCAN-006",
    type: "深度扫描",
    startTime: "2024-02-25T20:00:00Z",
    endTime: "2024-02-26T06:30:00Z",
    duration: "10小时30分钟",
    status: "已完成",
    organization: "华为技术有限公司",
    organizationId: "ORG-001",
    domainsScanned: 25,
    vulnerabilitiesFound: 45,
    highRisk: 5,
    mediumRisk: 15,
    lowRisk: 25,
    scanBy: "security_team",
    scanByName: "安全团队",
    reportUrl: "/reports/scan-006.pdf",
    scanConfig: {
      targets: ["*.huawei.com"],
      scanType: "deep",
      includeSubdomains: true,
      portRange: "1-65535",
      enableBruteForce: true,
      enableDirectoryEnumeration: true
    },
    progress: 100
  },
  {
    id: "SCAN-007",
    type: "合规性扫描",
    startTime: "2024-02-20T09:00:00Z",
    endTime: "2024-02-20T11:30:00Z",
    duration: "2小时30分钟",
    status: "已完成",
    organization: "华为技术有限公司",
    organizationId: "ORG-001",
    domainsScanned: 15,
    vulnerabilitiesFound: 8,
    highRisk: 0,
    mediumRisk: 3,
    lowRisk: 5,
    scanBy: "compliance_team",
    scanByName: "合规团队",
    reportUrl: "/reports/scan-007.pdf",
    scanConfig: {
      targets: ["huawei.com", "huaweicloud.com"],
      scanType: "compliance",
      includeSubdomains: true,
      complianceStandards: ["OWASP Top 10", "ISO 27001", "SOC 2"]
    },
    progress: 100
  },
  {
    id: "SCAN-008",
    type: "定期扫描",
    startTime: "2024-02-15T02:00:00Z",
    endTime: "2024-02-15T04:45:00Z",
    duration: "2小时45分钟",
    status: "已完成",
    organization: "华为技术有限公司",
    organizationId: "ORG-001",
    domainsScanned: 10,
    vulnerabilitiesFound: 12,
    highRisk: 1,
    mediumRisk: 4,
    lowRisk: 7,
    scanBy: "system",
    scanByName: "系统定期扫描",
    reportUrl: "/reports/scan-008.pdf",
    scanConfig: {
      targets: ["huawei.com", "vmall.com", "hicloud.com"],
      scanType: "scheduled",
      includeSubdomains: false,
      portRange: "1-1024",
      schedule: "weekly"
    },
    progress: 100
  }
]

interface OrganizationScanHistoryProps {
  organizationId: string
}

type ViewState = "loading" | "data" | "empty" | "error"
type StatusFilter = "all" | "已完成" | "进行中" | "失败" | "已取消"
type TypeFilter = "all" | "全面扫描" | "快速扫描" | "漏洞验证" | "自定义扫描"

export default function OrganizationScanHistory({ organizationId }: OrganizationScanHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [viewState, setViewState] = useState<ViewState>("data")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [scanHistory] = useState(sampleScanHistory)

  const filteredHistory = scanHistory.filter((scan) => {
    const matchesSearch = 
      scan.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scan.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scan.scanBy.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || scan.status === statusFilter
    const matchesType = typeFilter === "all" || scan.type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "已完成":
        return <Badge variant="default" className="bg-green-100 text-green-800">已完成</Badge>
      case "进行中":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">进行中</Badge>
      case "失败":
        return <Badge variant="destructive">失败</Badge>
      case "已取消":
        return <Badge variant="secondary">已取消</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "已完成":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "进行中":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "失败":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "已取消":
        return <AlertCircle className="h-4 w-4 text-gray-600" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "全面扫描":
        return "bg-purple-100 text-purple-800"
      case "快速扫描":
        return "bg-blue-100 text-blue-800"
      case "漏洞验证":
        return "bg-orange-100 text-orange-800"
      case "自定义扫描":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return "-"
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return diffHours > 0 ? `${diffHours}小时${diffMins}分钟` : `${diffMins}分钟`
  }

  const LoadingState = () => (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-muted-foreground">正在加载扫描历史...</span>
      </div>
    </div>
  )

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-muted p-3 mb-4">
        <Clock className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">暂无扫描历史</h3>
      <p className="text-muted-foreground text-center mb-4">
        {searchTerm ? "请尝试调整搜索条件" : "该组织暂无扫描历史记录"}
      </p>
      <Button>
        开始新扫描
      </Button>
    </div>
  )

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-destructive/10 p-3 mb-4">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-2">出现错误</h3>
      <p className="text-muted-foreground text-center mb-4">无法加载扫描历史，请重试。</p>
      <Button variant="outline" onClick={() => setViewState("data")}>
        重新尝试
      </Button>
    </div>
  )

  const DataTable = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-8 px-4 py-1 text-sm font-medium">扫描ID</TableHead>
            <TableHead className="h-8 px-4 py-1 text-sm font-medium">扫描类型</TableHead>
            <TableHead className="h-8 px-4 py-1 text-sm font-medium">状态</TableHead>
            <TableHead className="h-8 px-4 py-1 text-sm font-medium">开始时间</TableHead>
            <TableHead className="hidden md:table-cell h-8 px-4 py-1 text-sm font-medium">持续时间</TableHead>
            <TableHead className="hidden lg:table-cell h-8 px-4 py-1 text-sm font-medium">域名数量</TableHead>
            <TableHead className="hidden lg:table-cell h-8 px-4 py-1 text-sm font-medium">发现漏洞</TableHead>
            <TableHead className="hidden sm:table-cell h-8 px-4 py-1 text-sm font-medium">执行者</TableHead>
            <TableHead className="text-right h-8 px-4 py-1 text-sm font-medium">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedHistory.map((scan) => (
            <TableRow key={scan.id}>
              <TableCell className="px-3 py-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(scan.status)}
                  <code className="text-sm">{scan.id}</code>
                </div>
              </TableCell>
              <TableCell className="px-3 py-2">
                <Badge variant="secondary" className={getTypeColor(scan.type)}>
                  {scan.type}
                </Badge>
              </TableCell>
              <TableCell className="px-3 py-2">{getStatusBadge(scan.status)}</TableCell>
              <TableCell className="px-3 py-2">
                <div>
                  <div className="font-medium">
                    {new Date(scan.startTime).toLocaleDateString("zh-CN")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(scan.startTime).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell px-3 py-2">
                {scan.duration || formatDuration(scan.startTime, scan.endTime) || "-"}
              </TableCell>
              <TableCell className="hidden lg:table-cell px-3 py-2">
                <span className="font-medium">{scan.domainsScanned}</span>
              </TableCell>
              <TableCell className="hidden lg:table-cell px-3 py-2">
                {scan.status === "已完成" ? (
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{scan.vulnerabilitiesFound}</span>
                    <div className="flex space-x-1">
                      {scan.highRisk > 0 && (
                        <Badge variant="destructive" className="text-xs px-1">
                          {scan.highRisk}高
                        </Badge>
                      )}
                      {scan.mediumRisk > 0 && (
                        <Badge variant="secondary" className="text-xs px-1 bg-orange-100 text-orange-800">
                          {scan.mediumRisk}中
                        </Badge>
                      )}
                      {scan.lowRisk > 0 && (
                        <Badge variant="secondary" className="text-xs px-1 bg-yellow-100 text-yellow-800">
                          {scan.lowRisk}低
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="hidden sm:table-cell px-3 py-2">
                <span className="text-sm">{scan.scanByName || scan.scanBy}</span>
              </TableCell>
              <TableCell className="text-right px-3 py-2">
                <div className="flex items-center justify-end space-x-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {scan.reportUrl && (
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
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
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">总扫描次数</p>
                <p className="text-xl font-bold">{scanHistory.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">成功扫描</p>
                <p className="text-xl font-bold">
                  {scanHistory.filter(s => s.status === "已完成").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">失败扫描</p>
                <p className="text-xl font-bold">
                  {scanHistory.filter(s => s.status === "失败").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">最近扫描</p>
                <p className="text-sm font-medium">
                  {scanHistory.length > 0 
                    ? new Date(scanHistory[0].startTime).toLocaleDateString("zh-CN")
                    : "无记录"
                  }
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
            placeholder="搜索扫描ID或执行者..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={(value: TypeFilter) => setTypeFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="扫描类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="全面扫描">全面扫描</SelectItem>
              <SelectItem value="快速扫描">快速扫描</SelectItem>
              <SelectItem value="漏洞验证">漏洞验证</SelectItem>
              <SelectItem value="自定义扫描">自定义扫描</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="已完成">已完成</SelectItem>
              <SelectItem value="进行中">进行中</SelectItem>
              <SelectItem value="失败">失败</SelectItem>
              <SelectItem value="已取消">已取消</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            开始新扫描
          </Button>
        </div>
      </div>

      {/* 主要内容 */}
      <Card>
        <CardContent className="p-0">
          {viewState === "loading" && <LoadingState />}
          {viewState === "empty" && <EmptyState />}
          {viewState === "error" && <ErrorState />}
          {viewState === "data" && <>{filteredHistory.length === 0 ? <EmptyState /> : <DataTable />}</>}
        </CardContent>
      </Card>

      {/* 分页控件 */}
      {viewState === "data" && filteredHistory.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredHistory.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
} 