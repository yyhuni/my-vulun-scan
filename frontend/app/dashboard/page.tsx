import { DashboardStatCards } from "@/components/dashboard/dashboard-stat-cards"
import { DashboardScanHistory } from "@/components/dashboard/dashboard-scan-history"
import { AssetDistributionChart } from "@/components/dashboard/asset-distribution-chart"
import { VulnSeverityChart } from "@/components/dashboard/vuln-severity-chart"
import { RecentVulnerabilities } from "@/components/dashboard/recent-vulnerabilities"
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

      {/* 图表区域 */}
      <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
        {/* 资产分布图表 */}
        <AssetDistributionChart />

        {/* 漏洞严重程度分布 */}
        <VulnSeverityChart />
      </div>

      {/* 列表区域 */}
      <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
        {/* 最近漏洞 */}
        <RecentVulnerabilities />

        {/* 正在扫描 */}
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
