"use client"

import { useQuery } from "@tanstack/react-query"
import { VulnerabilityService } from "@/services/vulnerability.service"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { VulnerabilitySeverity } from "@/types/vulnerability.types"

const severityConfig: Record<VulnerabilitySeverity, { label: string; className: string }> = {
  critical: { label: "严重", className: "bg-red-600 text-white hover:bg-red-600" },
  high: { label: "高危", className: "bg-orange-500 text-white hover:bg-orange-500" },
  medium: { label: "中危", className: "bg-yellow-500 text-white hover:bg-yellow-500" },
  low: { label: "低危", className: "bg-blue-500 text-white hover:bg-blue-500" },
  info: { label: "信息", className: "bg-gray-500 text-white hover:bg-gray-500" },
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function truncateUrl(url: string, maxLength = 40) {
  if (url.length <= maxLength) return url
  return url.slice(0, maxLength) + "..."
}

export function RecentVulnerabilities() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "recent-vulnerabilities"],
    queryFn: () => VulnerabilityService.getAllVulnerabilities({ page: 1, pageSize: 5 }),
  })

  const vulnerabilities = data?.results ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>最近漏洞</CardTitle>
        <CardDescription>最近发现的安全漏洞</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : vulnerabilities.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            暂无漏洞数据
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>类型</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>严重程度</TableHead>
                <TableHead>发现时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vulnerabilities.map((vuln: any) => (
                <TableRow key={vuln.id}>
                  <TableCell className="font-medium">{vuln.vulnType}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {truncateUrl(vuln.url)}
                  </TableCell>
                  <TableCell>
                    <Badge className={severityConfig[vuln.severity as VulnerabilitySeverity]?.className}>
                      {severityConfig[vuln.severity as VulnerabilitySeverity]?.label ?? vuln.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatTime(vuln.discoveredAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
