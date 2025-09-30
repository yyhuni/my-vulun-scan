"use client"

import { useState, useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Search, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Loader2, Download, Eye, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTable } from "@/components/custom-ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/custom-ui/data-table/data-table-column-header"

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

interface ScanHistory {
  id: string
  type: string
  startTime: string
  endTime: string | null
  duration: string | null
  status: string
  organization: string
  organizationId: string
  domainsScanned: number
  vulnerabilitiesFound: number
  highRisk: number
  mediumRisk: number
  lowRisk: number
  scanBy: string
  scanByName: string
  reportUrl: string | null
  error?: string
  scanConfig: {
    targets: string[]
    scanType: string
    includeSubdomains: boolean
    portRange: string
    customRules?: string[]
    enableBruteForce?: boolean
    enableDirectoryEnumeration?: boolean
    complianceStandards?: string[]
    schedule?: string
  }
  progress: number
}

// 类型断言函数
function asScanHistory(data: any): ScanHistory {
  return data as ScanHistory
}

interface OrganizationScanHistoryProps {
  organizationId: string
}

import type { ViewState, ScanStatusFilter, ScanTypeFilter } from "@/types/common.types"

export default function OrganizationScanHistory({ organizationId }: OrganizationScanHistoryProps) {
  const [viewState, setViewState] = useState<ViewState>("data")
  const [statusFilter, setStatusFilter] = useState<ScanStatusFilter>("all")
  const [typeFilter, setTypeFilter] = useState<ScanTypeFilter>("all")
  const [scanHistory] = useState<ScanHistory[]>(sampleScanHistory.map(asScanHistory))
  const [selectedCount, setSelectedCount] = useState(0)

  // 工具函数
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

  // 列定义
  const columns = useMemo<ColumnDef<ScanHistory>[]>(() => [
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
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="扫描ID" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(row.original.status)}
          <code className="text-sm">{row.getValue("id")}</code>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="扫描类型" />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary" className={getTypeColor(row.getValue("type"))}>
          {row.getValue("type")}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="状态" />
      ),
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
    {
      accessorKey: "startTime",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="开始时间" />
      ),
      cell: ({ row }) => {
        const startTime = row.getValue("startTime") as string
        return (
          <div>
            <div className="font-medium">
              {new Date(startTime).toLocaleDateString("zh-CN")}
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(startTime).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "duration",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="持续时间" />
      ),
      cell: ({ row }) => {
        const scan = row.original
        return scan.duration || formatDuration(scan.startTime, scan.endTime) || "-"
      },
      meta: {
        className: "hidden md:table-cell",
      },
    },
    {
      accessorKey: "domainsScanned",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="域名数量" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("domainsScanned")}</span>
      ),
      meta: {
        className: "hidden lg:table-cell",
      },
    },
    {
      accessorKey: "vulnerabilitiesFound",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="发现漏洞" />
      ),
      cell: ({ row }) => {
        const scan = row.original
        if (scan.status === "已完成") {
          return (
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
          )
        }
        return <span className="text-muted-foreground">-</span>
      },
      meta: {
        className: "hidden lg:table-cell",
      },
    },
    {
      accessorKey: "scanByName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="执行者" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("scanByName") || row.original.scanBy}</span>
      ),
      meta: {
        className: "hidden sm:table-cell",
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">操作</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end space-x-2">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          {row.original.reportUrl && (
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ], [])

  // 过滤数据
  const filteredHistory = scanHistory.filter((scan) => {
    const matchesStatus = statusFilter === "all" || scan.status === statusFilter
    const matchesType = typeFilter === "all" || scan.type === typeFilter

    return matchesStatus && matchesType
  })

  // 批量操作处理函数
  const handleBulkDelete = () => {
    if (selectedCount === 0) {
      // 这里可以显示提示信息，比如使用 toast
      console.log("请先选择要删除的扫描历史")
      return
    }

    // 这里可以实现批量删除逻辑
    console.log(`批量删除 ${selectedCount} 条扫描历史`)
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
        该组织暂无扫描历史记录
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
          data={filteredHistory}
          searchableColumns={['id', 'type', 'scanByName']}
          filterableColumns={[
            {
              key: 'status',
              title: '状态',
              options: [
                { label: '已完成', value: '已完成' },
                { label: '进行中', value: '进行中' },
                { label: '失败', value: '失败' },
                { label: '已取消', value: '已取消' },
              ]
            },
            {
              key: 'type',
              title: '扫描类型',
              options: [
                { label: '全面扫描', value: '全面扫描' },
                { label: '快速扫描', value: '快速扫描' },
                { label: '漏洞验证', value: '漏洞验证' },
                { label: '自定义扫描', value: '自定义扫描' },
              ]
            }
          ]}
          extraButtons={
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              disabled={selectedCount === 0}
              className={selectedCount === 0 ? "text-muted-foreground" : "text-destructive hover:text-destructive"}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              批量删除
            </Button>
          }
          onSelectionChange={(count) => setSelectedCount(count)}
        />
      )}
    </div>
  )
} 