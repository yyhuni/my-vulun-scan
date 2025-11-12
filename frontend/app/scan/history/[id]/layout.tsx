"use client"

import React from "react"
import { usePathname, useParams } from "next/navigation"
import Link from "next/link"
import { Target } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ScanHistoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { id } = useParams<{ id: string }>()
  const pathname = usePathname()

  const getActiveTab = () => {
    if (pathname.includes("/subdomain")) return "subdomain"
    if (pathname.includes("/endpoints")) return "endpoints"
    if (pathname.includes("/vulnerabilities")) return "vulnerabilities"
    if (pathname.includes("/ip-addresses")) return "ip-addresses"
    return ""
  }

  const basePath = `/scan/history/${id}`
  const tabPaths = {
    subdomain: `${basePath}/subdomain/`,
    endpoints: `${basePath}/endpoints/`,
    vulnerabilities: `${basePath}/vulnerabilities/`,
    "ip-addresses": `${basePath}/ip-addresses/`,
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target />
            Scan Results
          </h2>
          <p className="text-muted-foreground">扫描任务 ID：{id}</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 lg:px-6">
        <Tabs value={getActiveTab()} className="w-full">
          <TabsList>
            <TabsTrigger value="subdomain" asChild>
              <Link href={tabPaths.subdomain}>Subdomains</Link>
            </TabsTrigger>
            <TabsTrigger value="endpoints" asChild>
              <Link href={tabPaths.endpoints}>URLs</Link>
            </TabsTrigger>
            <TabsTrigger value="vulnerabilities" asChild>
              <Link href={tabPaths.vulnerabilities}>Vulnerabilities</Link>
            </TabsTrigger>
            <TabsTrigger value="ip-addresses" asChild>
              <Link href={tabPaths["ip-addresses"]}>IP Addresses</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {children}
    </div>
  )
}
