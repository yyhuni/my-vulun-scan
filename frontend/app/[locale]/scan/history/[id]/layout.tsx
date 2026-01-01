"use client"

import React from "react"
import { usePathname, useParams } from "next/navigation"
import Link from "next/link"
import { Target } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useScan } from "@/hooks/use-scans"
import { useTranslations } from "next-intl"

export default function ScanHistoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { id } = useParams<{ id: string }>()
  const pathname = usePathname()
  const { data: scanData, isLoading } = useScan(parseInt(id))
  const t = useTranslations("scan.history")

  const getActiveTab = () => {
    if (pathname.includes("/subdomain")) return "subdomain"
    if (pathname.includes("/endpoints")) return "endpoints"
    if (pathname.includes("/websites")) return "websites"
    if (pathname.includes("/directories")) return "directories"
    if (pathname.includes("/vulnerabilities")) return "vulnerabilities"
    if (pathname.includes("/ip-addresses")) return "ip-addresses"
    return ""
  }

  const basePath = `/scan/history/${id}`
  const tabPaths = {
    subdomain: `${basePath}/subdomain/`,
    endpoints: `${basePath}/endpoints/`,
    websites: `${basePath}/websites/`,
    directories: `${basePath}/directories/`,
    vulnerabilities: `${basePath}/vulnerabilities/`,
    "ip-addresses": `${basePath}/ip-addresses/`,
  }

  // Get counts for each tab from scan data
  const counts = {
    subdomain: scanData?.summary?.subdomains || 0,
    endpoints: scanData?.summary?.endpoints || 0,
    websites: scanData?.summary?.websites || 0,
    directories: scanData?.summary?.directories || 0,
    vulnerabilities: scanData?.summary?.vulnerabilities?.total || 0,
    "ip-addresses": scanData?.summary?.ips || 0,
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target />
            Scan Results
          </h2>
          <p className="text-muted-foreground">{t("taskId", { id })}</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 lg:px-6">
        <Tabs value={getActiveTab()} className="w-full">
          <TabsList>
            <TabsTrigger value="websites" asChild>
              <Link href={tabPaths.websites} className="flex items-center gap-0.5">
                Websites
                {counts.websites > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs">
                    {counts.websites}
                  </Badge>
                )}
              </Link>
            </TabsTrigger>
            <TabsTrigger value="subdomain" asChild>
              <Link href={tabPaths.subdomain} className="flex items-center gap-0.5">
                Subdomains
                {counts.subdomain > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs">
                    {counts.subdomain}
                  </Badge>
                )}
              </Link>
            </TabsTrigger>
            <TabsTrigger value="ip-addresses" asChild>
              <Link href={tabPaths["ip-addresses"]} className="flex items-center gap-0.5">
                IP Addresses
                {counts["ip-addresses"] > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs">
                    {counts["ip-addresses"]}
                  </Badge>
                )}
              </Link>
            </TabsTrigger>
            <TabsTrigger value="endpoints" asChild>
              <Link href={tabPaths.endpoints} className="flex items-center gap-0.5">
                URLs
                {counts.endpoints > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs">
                    {counts.endpoints}
                  </Badge>
                )}
              </Link>
            </TabsTrigger>
            <TabsTrigger value="directories" asChild>
              <Link href={tabPaths.directories} className="flex items-center gap-0.5">
                Directories
                {counts.directories > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs">
                    {counts.directories}
                  </Badge>
                )}
              </Link>
            </TabsTrigger>
            <TabsTrigger value="vulnerabilities" asChild>
              <Link href={tabPaths.vulnerabilities} className="flex items-center gap-0.5">
                Vulnerabilities
                {counts.vulnerabilities > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-xs">
                    {counts.vulnerabilities}
                  </Badge>
                )}
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {children}
    </div>
  )
}
