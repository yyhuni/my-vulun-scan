"use client"

import { useMemo } from 'react'
import { useDiskStats } from '@/hooks/use-disk'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBytes } from '@/lib/utils'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'

export function DiskUsage() {
  const { data, isLoading } = useDiskStats()

  const percent = useMemo(() => {
    if (!data || !data.totalBytes) return 0
    const p = (data.usedBytes / data.totalBytes) * 100
    return Math.max(0, Math.min(100, Number(p.toFixed(1))))
  }, [data])

  const chartConfig = useMemo(() => ({
    used: { label: '已使用', color: 'hsl(var(--chart-1))' },
  }) satisfies ChartConfig, [])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>磁盘占用</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-3 w-full" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ) : (
          <div className="relative">
            <ChartContainer config={chartConfig} className="relative h-[220px] w-full aspect-square">
              <RadialBarChart
                innerRadius={80}
                outerRadius={100}
                startAngle={90}
                endAngle={-270}
                data={[{ name: 'used', value: percent }]}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                  dataKey="value"
                  background
                  cornerRadius={4}
                  fill="var(--color-used)"
                />
              </RadialBarChart>
            </ChartContainer>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-2xl font-semibold">{percent}%</div>
                <div className="text-muted-foreground text-xs">
                  {formatBytes(data?.usedBytes || 0)} / {formatBytes(data?.totalBytes || 0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
