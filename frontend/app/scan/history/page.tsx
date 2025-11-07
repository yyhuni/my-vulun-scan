"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IconRadar } from "@tabler/icons-react"
import { ScanHistoryList } from "@/components/scan/history/scan-history-list"
import { useScans } from "@/hooks/use-scans"

/**
 * 扫描历史页面
 * 显示所有扫描任务的历史记录
 */
export default function ScanHistoryPage() {
  // 获取所有扫描数据用于统计（不分页）
  const { data } = useScans({ page: 1, pageSize: 1000 })
  
  const scans = data?.results || []
  const totalScans = data?.total || 0

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
              <div className="text-2xl font-bold">{totalScans}</div>
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
                {scans.filter(s => s.status === "successful").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                发现资产
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {scans.reduce((sum, s) => sum + s.summary.subdomains + s.summary.endpoints, 0)}
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
