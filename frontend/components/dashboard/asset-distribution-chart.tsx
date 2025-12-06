"use client"

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"
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
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function AssetDistributionChart() {
  const { data, isLoading } = useAssetStatistics()

  const chartData = [
    { name: "子域名", count: data?.totalSubdomains ?? 0 },
    { name: "IP地址", count: data?.totalIps ?? 0 },
    { name: "端点", count: data?.totalEndpoints ?? 0 },
    { name: "网站", count: data?.totalWebsites ?? 0 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>资产分布</CardTitle>
        <CardDescription>各类资产数量统计</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-8 w-3/5" />
            <Skeleton className="h-8 w-2/5" />
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ left: 0, right: 30 }}
            >
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                width={50}
              />
              <XAxis dataKey="count" type="number" hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar
                dataKey="count"
                layout="vertical"
                fill="var(--color-count)"
                radius={4}
              >
                <LabelList
                  dataKey="count"
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
