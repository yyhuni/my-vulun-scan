"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { useSystemMetrics } from "@/hooks/use-dashboard"

const chartConfig = {
  cpu: { label: "CPU", color: "hsl(var(--chart-1))" },
  memory: { label: "内存", color: "hsl(var(--chart-2))" },
  diskIo: { label: "磁盘 I/O", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig

export function SystemMetricsChart() {
  const [range] = React.useState<'1h' | '24h' | '7d'>('24h')
  const { data } = useSystemMetrics(range)
  const [activeMetric, setActiveMetric] = React.useState<keyof typeof chartConfig>("cpu")

  const formatted = React.useMemo(() => {
    return (data?.points || []).map(p => ({
      date: new Date(p.timestamp).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      ...p,
    }))
  }, [data])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{chartConfig[activeMetric].label} 使用率</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">最近 24 小时</span>
          <span className="@[540px]/card:hidden">Last 24 hours</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={activeMetric}
            onValueChange={(v) => v && setActiveMetric(v as keyof typeof chartConfig)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="cpu">CPU</ToggleGroupItem>
            <ToggleGroupItem value="memory">内存</ToggleGroupItem>
            <ToggleGroupItem value="diskIo">磁盘 I/O</ToggleGroupItem>
          </ToggleGroup>
          <Select value={activeMetric} onValueChange={(v: keyof typeof chartConfig) => setActiveMetric(v)}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a metric"
            >
              <SelectValue placeholder="CPU" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="cpu" className="rounded-lg">CPU</SelectItem>
              <SelectItem value="memory" className="rounded-lg">内存</SelectItem>
              <SelectItem value="diskIo" className="rounded-lg">磁盘 I/O</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="fillCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-cpu)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-cpu)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillMemory" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-memory)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-memory)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillDiskIo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-diskIo)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-diskIo)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                return value
              }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <Area
              dataKey={activeMetric as string}
              type="natural"
              fill={`url(#${activeMetric === 'cpu' ? 'fillCpu' : activeMetric === 'memory' ? 'fillMemory' : 'fillDiskIo'})`}
              stroke={`var(--color-${activeMetric})`}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

