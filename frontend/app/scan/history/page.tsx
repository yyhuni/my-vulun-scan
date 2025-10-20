"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconRadar } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { ScanHistoryList } from "@/components/scan/history/scan-history-list"

// 模拟数据 - 用于统计卡片
const mockData = [
  {
    id: 1,
    name: "生产环境安全扫描",
    type: "全面扫描",
    targets: ["example.com", "api.example.com"],
    status: "completed" as const,
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
    status: "running" as const,
    startTime: "2025-01-13 10:20:00",
    findings: 12,
  },
  {
    id: 3,
    name: "API接口漏洞扫描",
    type: "漏洞扫描",
    targets: ["192.168.1.100"],
    status: "failed" as const,
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
    status: "pending" as const,
    startTime: "2025-01-13 16:00:00",
    findings: 0,
  },
  {
    id: 5,
    name: "Web应用漏洞检测",
    type: "漏洞扫描",
    targets: ["webapp.example.com"],
    status: "completed" as const,
    startTime: "2025-01-11 09:00:00",
    endTime: "2025-01-11 10:30:00",
    duration: "1小时30分",
    findings: 15,
  },
]

/**
 * 扫描历史页面
 * 显示所有扫描任务的历史记录
 */
export default function ScanHistoryPage() {
  const router = useRouter()
  const [scans] = useState(mockData)

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        {/* 页面标题 */}
        <div className="flex items-center gap-3 mb-6">
          <IconRadar className="size-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">扫描历史</h1>
            <p className="text-muted-foreground">查看和管理所有扫描任务记录</p>
          </div>
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

        {/* 扫描历史列表 */}
        <ScanHistoryList />
      </div>
    </div>
  )
}
