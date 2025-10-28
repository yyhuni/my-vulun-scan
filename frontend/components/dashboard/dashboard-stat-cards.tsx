"use client"

import { useDashboardStats } from "@/hooks/use-dashboard"
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { IconTarget, IconTopologyStar, IconLink, IconShieldLock } from "@tabler/icons-react"

function StatCard({
  title,
  value,
  icon,
  trendText,
  loading,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  trendText?: string
  loading?: boolean
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          {icon}
          {title}
        </CardDescription>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {value}
          </CardTitle>
        )}
        <CardAction>
          <Badge variant="outline">{trendText ?? "Today"}</Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">Overview</div>
        <div className="text-muted-foreground">System-wide</div>
      </CardFooter>
    </Card>
  )
}

export function DashboardStatCards() {
  const { data, isLoading } = useDashboardStats()

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <StatCard
        title="Total Targets"
        value={data?.totalTargets ?? 0}
        icon={<IconTarget />}
        loading={isLoading}
      />
      <StatCard
        title="Total Subdomains"
        value={data?.totalSubdomains ?? 0}
        icon={<IconTopologyStar />}
        loading={isLoading}
      />
      <StatCard
        title="Total Endpoints"
        value={data?.totalEndpoints ?? 0}
        icon={<IconLink />}
        loading={isLoading}
      />
      <StatCard
        title="Total Vulnerabilities"
        value={data?.totalVulnerabilities ?? 0}
        icon={<IconShieldLock />}
        loading={isLoading}
      />
    </div>
  )
}
