import { DashboardStatCards } from "@/components/dashboard/dashboard-stat-cards"
import { SystemMetricsChart } from "@/components/dashboard/system-metrics-chart"
import { DashboardScanHistory } from "@/components/dashboard/dashboard-scan-history"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * 仪表板页面组件
 * 这是应用的主要仪表板页面,包含卡片、图表和数据表格
 * 布局结构已移至根布局组件中
 */
export default function Page() {
  return (
    // 内容区域,包含卡片、图表和数据表格
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* 顶部统计卡片 */}
      <DashboardStatCards />

      {/* 图表区域,带有水平内边距 */}
      <div className="px-4 lg:px-6">
        <SystemMetricsChart />
      </div>

      {/* 底部数据表格：正在扫描 与 任务情况 */}
      <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
        <Card className="@container/card">
          <CardHeader>
            <CardTitle>正在扫描</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardScanHistory />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
