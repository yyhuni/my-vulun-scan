"use client"

import { Pie, PieChart, Cell } from "recharts"
import { useAssetStatistics } from "@/hooks/use-dashboard"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

const chartConfig = {
  count: {
    label: "数量",
  },
  critical: {
    label: "严重",
    color: "#dc2626",
  },
  high: {
    label: "高危",
    color: "#f97316",
  },
  medium: {
    label: "中危",
    color: "#eab308",
  },
  low: {
    label: "低危",
    color: "#3b82f6",
  },
  info: {
    label: "信息",
    color: "#6b7280",
  },
} satisfies ChartConfig

export function VulnSeverityChart() {
  const { data, isLoading } = useAssetStatistics()

  const vulnData = data?.vulnBySeverity
  const chartData = [
    { severity: "critical", count: vulnData?.critical ?? 0, fill: chartConfig.critical.color },
    { severity: "high", count: vulnData?.high ?? 0, fill: chartConfig.high.color },
    { severity: "medium", count: vulnData?.medium ?? 0, fill: chartConfig.medium.color },
    { severity: "low", count: vulnData?.low ?? 0, fill: chartConfig.low.color },
    { severity: "info", count: vulnData?.info ?? 0, fill: chartConfig.info.color },
  ].filter(item => item.count > 0)

  const total = chartData.reduce((sum, item) => sum + item.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>漏洞分布</CardTitle>
        <CardDescription>按严重程度统计</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <Skeleton className="h-[160px] w-[160px] rounded-full" />
          </div>
        ) : total === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            暂无漏洞数据
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <ChartContainer config={chartConfig} className="aspect-square h-[200px] flex-1">
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent nameKey="severity" hideLabel />}
                />
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="severity"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.severity} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-col gap-2 text-sm">
              {chartData.map((item) => (
                <div key={item.severity} className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-muted-foreground">
                    {chartConfig[item.severity as keyof typeof chartConfig]?.label}
                  </span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
