"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  IconRadar, 
  IconSearch, 
  IconEye, 
  IconTrash,
  IconClock,
  IconCircleCheck,
  IconCircleX,
  IconLoader,
  IconPlus,
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// 扫描状态类型
type ScanStatus = "pending" | "running" | "completed" | "failed"

// 扫描记录类型
interface ScanRecord {
  id: number
  name: string
  type: string
  targets: string[]
  status: ScanStatus
  startTime: string
  endTime?: string
  duration?: string
  findings: number
}

// 模拟数据
const mockData: ScanRecord[] = [
  {
    id: 1,
    name: "生产环境安全扫描",
    type: "全面扫描",
    targets: ["example.com", "api.example.com"],
    status: "completed",
    startTime: "2025-01-10 14:30:00",
    endTime: "2025-01-10 15:45:00",
    duration: "1小时15分",
    findings: 23,
  },
  {
    id: 2,
    name: "开发环境快速检测",
    type: "快速扫描",
    targets: ["dev.example.com"],
    status: "running",
    startTime: "2025-01-13 10:20:00",
    findings: 12,
  },
  {
    id: 3,
    name: "API接口漏洞扫描",
    type: "漏洞扫描",
    targets: ["192.168.1.100"],
    status: "failed",
    startTime: "2025-01-12 08:15:00",
    endTime: "2025-01-12 08:20:00",
    duration: "5分钟",
    findings: 0,
  },
  {
    id: 4,
    name: "测试环境端口扫描",
    type: "端口扫描",
    targets: ["192.168.1.0/24"],
    status: "pending",
    startTime: "2025-01-13 16:00:00",
    findings: 0,
  },
]

// 状态徽章组件
function StatusBadge({ status }: { status: ScanStatus }) {
  const config = {
    pending: {
      icon: IconClock,
      label: "等待中",
      className: "bg-yellow-50 text-yellow-700 border-yellow-300",
    },
    running: {
      icon: IconLoader,
      label: "运行中",
      className: "bg-blue-50 text-blue-700 border-blue-300 animate-pulse",
    },
    completed: {
      icon: IconCircleCheck,
      label: "已完成",
      className: "bg-green-50 text-green-700 border-green-300",
    },
    failed: {
      icon: IconCircleX,
      label: "失败",
      className: "bg-red-50 text-red-700 border-red-300",
    },
  }

  const { icon: Icon, label, className } = config[status]

  return (
    <Badge variant="outline" className={className}>
      <Icon />
      {label}
    </Badge>
  )
}

/**
 * 扫描历史页面
 * 显示所有扫描任务的历史记录
 */
export default function ScanHistoryPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [scans] = useState<ScanRecord[]>(mockData)

  // 过滤扫描记录
  const filteredScans = scans.filter(scan =>
    scan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scan.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scan.targets.some(target => target.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // 查看扫描详情
  const viewDetails = (id: number) => {
    // TODO: 跳转到扫描详情页面
    console.log("查看扫描详情:", id)
  }

  // 删除扫描记录
  const deleteScan = (id: number) => {
    // TODO: 调用 API 删除扫描记录
    console.log("删除扫描记录:", id)
  }

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <IconRadar className="size-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">扫描历史</h1>
              <p className="text-muted-foreground">查看和管理所有扫描任务记录</p>
            </div>
          </div>
          <Button onClick={() => router.push("/scan/new")}>
            <IconPlus />
            新建扫描
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                总扫描次数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scans.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                运行中
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {scans.filter(s => s.status === "running").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                已完成
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {scans.filter(s => s.status === "completed").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                发现问题
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {scans.reduce((sum, s) => sum + s.findings, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 扫描列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>扫描记录</CardTitle>
                <CardDescription>所有扫描任务的详细记录</CardDescription>
              </div>
              <div className="relative w-64">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="搜索扫描记录..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>扫描名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>目标</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>开始时间</TableHead>
                  <TableHead>持续时间</TableHead>
                  <TableHead>发现问题</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      没有找到匹配的扫描记录
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredScans.map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell className="font-medium">{scan.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{scan.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {scan.targets.map((target, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {target}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={scan.status} />
                      </TableCell>
                      <TableCell className="text-sm">{scan.startTime}</TableCell>
                      <TableCell className="text-sm">
                        {scan.duration || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={scan.findings > 0 ? "destructive" : "secondary"}>
                          {scan.findings}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewDetails(scan.id)}
                          >
                            <IconEye />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteScan(scan.id)}
                          >
                            <IconTrash />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
