"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { AlertTriangle, Shield, Eye, ExternalLink, Loader2, AlertCircle, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTable } from "@/components/custom-ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/custom-ui/data-table/data-table-column-header"
import { vulnerabilityService } from "@/services/vulnerability.service"
import type { Vulnerability } from "@/types/scan.types"


interface OrganizationVulnerabilitiesProps {
  organizationId: string
}

import type { ViewState, SeverityFilter, VulnerabilityStatusFilter } from "@/types/common.types"

export default function OrganizationVulnerabilities({ organizationId }: OrganizationVulnerabilitiesProps) {
  const [viewState, setViewState] = useState<ViewState>("loading")
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([])
  const [selectedCount, setSelectedCount] = useState(0)
  // 工具函数
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

  // 列定义
  const columns = useMemo<ColumnDef<Vulnerability>[]>(() => [
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
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="漏洞标题" />
      ),
      cell: ({ row }) => (
        <div className="font-medium max-w-[200px] truncate">
          <div className="hover:underline flex items-center gap-1">
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
            {row.getValue("title")}
          </div>
          <div className="text-sm text-muted-foreground mt-1 line-clamp-1">{row.original.description || ''}</div>
        </div>
      ),
    },
    {
      accessorKey: "severity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="严重程度" />
      ),
      cell: ({ row }) => getSeverityBadge(row.getValue("severity")),
    },
    {
      accessorKey: "domain",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="影响域名" />
      ),
      cell: ({ row }) => row.getValue("domain"),
      meta: {
        className: "hidden sm:table-cell",
      },
    },
    {
      accessorKey: "discoveredDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="发现日期" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("discoveredDate") as string
        return new Date(date).toLocaleDateString("zh-CN")
      },
      meta: {
        className: "hidden lg:table-cell",
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

  // 获取漏洞数据
  const fetchVulnerabilities = useCallback(async () => {
    if (!organizationId) return
    
    try {
      setViewState("loading")
      const data = await vulnerabilityService.getOrganizationVulnerabilities({
        organizationId
      })
      setVulnerabilities(data)
      setViewState(data.length > 0 ? "data" : "empty")
    } catch (error) {
      console.error('获取漏洞数据失败:', error)
      setViewState("error")
      toast.error(`获取漏洞数据失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, [organizationId])

  // 组件加载时获取数据
  useEffect(() => {
    fetchVulnerabilities()
  }, [fetchVulnerabilities])

  // 过滤后的漏洞数据（基本过滤，详细搜索由 DataTable 处理）
  const filteredVulnerabilities = vulnerabilities

  // 批量操作处理函数
  const handleBulkDelete = () => {
    if (selectedCount === 0) {
      // 这里可以显示提示信息，比如使用 toast
      console.log("请先选择要删除的漏洞")
      return
    }

    // 这里可以实现批量删除逻辑
    console.log(`批量删除 ${selectedCount} 个漏洞`)
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
        该组织暂无漏洞数据
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
      <Button variant="outline" onClick={fetchVulnerabilities}>
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
          data={filteredVulnerabilities}
          searchableColumns={['title', 'description', 'domain', 'cve']}
          filterableColumns={[
            {
              key: 'severity',
              title: '严重程度',
              options: [
                { label: '高危', value: '高危' },
                { label: '中危', value: '中危' },
                { label: '低危', value: '低危' },
              ]
            },
            {
              key: 'status',
              title: '状态',
              options: [
                { label: '待修复', value: '待修复' },
                { label: '处理中', value: '处理中' },
                { label: '已修复', value: '已修复' },
                { label: '已忽略', value: '已忽略' },
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
          onSelectionChange={(count: number) => setSelectedCount(count)}
        />
      )}
    </div>
  )
} 