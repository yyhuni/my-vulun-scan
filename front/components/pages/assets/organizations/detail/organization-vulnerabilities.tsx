"use client"

import { useState } from "react"
import { Search, Filter, AlertTriangle, Shield, Eye, ExternalLink, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TablePagination } from "@/components/common/table-pagination"

// 模拟漏洞数据 - 参考 mocks/handlers/vulnerability-handlers.ts
const sampleVulnerabilities = [
  {
    id: "VUL-001",
    title: "SQL 注入漏洞",
    severity: "高危",
    cvss: 9.8,
    cve: "CVE-2024-1234",
    domain: "api.huawei.com",
    port: 443,
    service: "Web Application",
    description: "在用户登录接口发现SQL注入漏洞，可能导致数据库信息泄露",
    discoveredDate: "2024-03-20T10:30:00",
    status: "待修复",
    organization: "华为技术有限公司",
    affectedUrl: "https://api.huawei.com/login",
    riskScore: 95,
    poc: "POST /login HTTP/1.1\nContent-Type: application/json\n{\"username\":\"admin' OR 1=1--\",\"password\":\"test\"}",
    solution: "使用参数化查询或预编译语句来避免SQL注入"
  },
  {
    id: "VUL-002", 
    title: "跨站脚本攻击 (XSS)",
    severity: "中危",
    cvss: 6.1,
    cve: "CVE-2024-1235",
    domain: "www.huawei.com",
    port: 80,
    service: "Web Server",
    description: "在搜索功能中发现反射型XSS漏洞，可能导致用户会话劫持",
    discoveredDate: "2024-03-18T14:20:00",
    status: "已修复",
    organization: "华为技术有限公司",
    affectedUrl: "https://www.huawei.com/search",
    riskScore: 72,
    poc: "GET /search?q=<script>alert('XSS')</script> HTTP/1.1",
    solution: "对用户输入进行适当的HTML编码和验证"
  },
  {
    id: "VUL-003",
    title: "SSL/TLS 配置错误",
    severity: "中危", 
    cvss: 5.4,
    cve: "",
    domain: "mail.huawei.com",
    port: 443,
    service: "HTTPS",
    description: "SSL证书配置存在安全问题，使用了弱加密套件",
    discoveredDate: "2024-03-15T09:45:00",
    status: "处理中",
    organization: "华为技术有限公司",
    affectedUrl: "https://mail.huawei.com",
    riskScore: 58,
    poc: "使用 OpenSSL 测试弱加密套件：openssl s_client -connect mail.huawei.com:443 -cipher 'DES-CBC3-SHA'",
    solution: "更新SSL/TLS配置，禁用弱加密套件，启用强加密算法"
  },
  {
    id: "VUL-004",
    title: "信息泄露",
    severity: "低危",
    cvss: 3.7,
    cve: "",
    domain: "old.huawei.com",
    port: 80,
    service: "Web Server",
    description: "服务器版本信息在HTTP响应头中暴露",
    discoveredDate: "2024-03-10T16:30:00",
    status: "已忽略",
    organization: "华为技术有限公司",
    affectedUrl: "http://old.huawei.com",
    riskScore: 25,
    poc: "curl -I http://old.huawei.com | grep Server",
    solution: "配置服务器隐藏版本信息，移除或自定义Server响应头"
  },
  {
    id: "VUL-005",
    title: "目录遍历漏洞",
    severity: "高危",
    cvss: 8.6,
    cve: "CVE-2024-1236",
    domain: "api.huawei.com",
    port: 8080,
    service: "API Server",
    description: "发现目录遍历漏洞，攻击者可以访问敏感文件",
    discoveredDate: "2024-03-22T11:15:00",
    status: "待修复",
    organization: "华为技术有限公司",
    affectedUrl: "https://api.huawei.com/files",
    riskScore: 89,
    poc: "GET /files/../../../etc/passwd HTTP/1.1",
    solution: "验证和规范化文件路径，限制文件访问权限"
  },
  {
    id: "VUL-006",
    title: "认证绕过漏洞",
    severity: "高危",
    cvss: 9.1,
    cve: "CVE-2024-1237",
    domain: "admin.huawei.com",
    port: 443,
    service: "Admin Panel",
    description: "管理后台存在认证绕过漏洞，未经授权可访问敏感功能",
    discoveredDate: "2024-03-25T08:20:00",
    status: "待修复",
    organization: "华为技术有限公司",
    affectedUrl: "https://admin.huawei.com/dashboard",
    riskScore: 98,
    poc: "使用特定HTTP头绕过认证：X-Forwarded-For: 127.0.0.1",
    solution: "加强身份验证机制，修复认证逻辑漏洞"
  },
  {
    id: "VUL-007",
    title: "文件上传漏洞",
    severity: "中危",
    cvss: 7.2,
    cve: "",
    domain: "upload.huawei.com",
    port: 443,
    service: "File Upload Service",
    description: "文件上传功能缺乏充分的文件类型验证",
    discoveredDate: "2024-03-19T13:40:00",
    status: "处理中",
    organization: "华为技术有限公司",
    affectedUrl: "https://upload.huawei.com/upload",
    riskScore: 76,
    poc: "上传恶意PHP文件绕过文件类型检查",
    solution: "实施严格的文件类型和内容验证，限制上传文件权限"
  }
]

interface OrganizationVulnerabilitiesProps {
  organizationId: string
}

type ViewState = "loading" | "data" | "empty" | "error"
type SeverityFilter = "all" | "高危" | "中危" | "低危"
type StatusFilter = "all" | "待修复" | "处理中" | "已修复" | "已忽略"

export default function OrganizationVulnerabilities({ organizationId }: OrganizationVulnerabilitiesProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [viewState, setViewState] = useState<ViewState>("data")
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [vulnerabilities] = useState(sampleVulnerabilities)

  const filteredVulnerabilities = vulnerabilities.filter((vuln) => {
    const matchesSearch = 
      vuln.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vuln.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vuln.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vuln.cve.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSeverity = severityFilter === "all" || vuln.severity === severityFilter
    const matchesStatus = statusFilter === "all" || vuln.status === statusFilter
    
    return matchesSearch && matchesSeverity && matchesStatus
  })

  const paginatedVulnerabilities = filteredVulnerabilities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "高危":
        return <Badge variant="destructive">高危</Badge>
      case "中危":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">中危</Badge>
      case "低危":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">低危</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "待修复":
        return <Badge variant="destructive">待修复</Badge>
      case "处理中":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">处理中</Badge>
      case "已修复":
        return <Badge variant="default" className="bg-green-100 text-green-800">已修复</Badge>
      case "已忽略":
        return <Badge variant="secondary">已忽略</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCVSSColor = (cvss: number) => {
    if (cvss >= 9.0) return "text-red-600"
    if (cvss >= 7.0) return "text-orange-600"
    if (cvss >= 4.0) return "text-yellow-600"
    return "text-green-600"
  }

  const LoadingState = () => (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-muted-foreground">正在加载漏洞数据...</span>
      </div>
    </div>
  )

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-muted p-3 mb-4">
        <Shield className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">未找到漏洞</h3>
      <p className="text-muted-foreground text-center mb-4">
        {searchTerm ? "请尝试调整搜索条件" : "该组织暂无漏洞数据"}
      </p>
    </div>
  )

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-destructive/10 p-3 mb-4">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-2">出现错误</h3>
      <p className="text-muted-foreground text-center mb-4">无法加载漏洞数据，请重试。</p>
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
            <TableHead className="h-8 px-4 py-1 text-sm font-medium">漏洞标题</TableHead>
            <TableHead className="h-8 px-4 py-1 text-sm font-medium">严重程度</TableHead>
            <TableHead className="hidden sm:table-cell h-8 px-4 py-1 text-sm font-medium">影响域名</TableHead>
            <TableHead className="hidden lg:table-cell h-8 px-4 py-1 text-sm font-medium">发现日期</TableHead>
            <TableHead className="h-8 px-4 py-1 text-sm font-medium">状态</TableHead>
            <TableHead className="text-right h-8 px-4 py-1 text-sm font-medium">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedVulnerabilities.map((vuln) => (
            <TableRow key={vuln.id}>
              <TableCell className="font-medium max-w-[200px] truncate px-3 py-2">
                <a href={vuln.affectedUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  {vuln.title}
                </a>
                <div className="text-sm text-muted-foreground mt-1 line-clamp-1">{vuln.description}</div>
              </TableCell>
              <TableCell className="px-3 py-2">{getSeverityBadge(vuln.severity)}</TableCell>
              <TableCell className="hidden sm:table-cell px-3 py-2">{vuln.domain}</TableCell>
              <TableCell className="hidden lg:table-cell px-3 py-2">
                {new Date(vuln.discoveredDate).toLocaleDateString("zh-CN")}
              </TableCell>
              <TableCell className="px-3 py-2">{getStatusBadge(vuln.status)}</TableCell>
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
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">总漏洞数</p>
                <p className="text-xl font-bold">{vulnerabilities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-red-600 rounded-full" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">高危漏洞</p>
                <p className="text-xl font-bold">
                  {vulnerabilities.filter(v => v.severity === "高危").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-orange-600 rounded-full" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">中危漏洞</p>
                <p className="text-xl font-bold">
                  {vulnerabilities.filter(v => v.severity === "中危").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-red-600 rounded-full" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">待修复</p>
                <p className="text-xl font-bold">
                  {vulnerabilities.filter(v => v.status === "待修复").length}
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
            placeholder="搜索漏洞标题、描述或CVE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={severityFilter} onValueChange={(value: SeverityFilter) => setSeverityFilter(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="严重程度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部严重程度</SelectItem>
              <SelectItem value="高危">高危</SelectItem>
              <SelectItem value="中危">中危</SelectItem>
              <SelectItem value="低危">低危</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="待修复">待修复</SelectItem>
              <SelectItem value="处理中">处理中</SelectItem>
              <SelectItem value="已修复">已修复</SelectItem>
              <SelectItem value="已忽略">已忽略</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 主要内容 */}
      <Card>
        <CardContent className="p-0">
          {viewState === "loading" && <LoadingState />}
          {viewState === "empty" && <EmptyState />}
          {viewState === "error" && <ErrorState />}
          {viewState === "data" && <>{filteredVulnerabilities.length === 0 ? <EmptyState /> : <DataTable />}</>}
        </CardContent>
      </Card>

      {/* 分页控件 */}
      {viewState === "data" && filteredVulnerabilities.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredVulnerabilities.length}
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