"use client"

import { useQuery } from "@tanstack/react-query"

import { VulnerabilityService } from "@/services/vulnerability.service"
import type {
  Vulnerability,
  VulnerabilitySeverity,
  GetVulnerabilitiesParams,
} from "@/types/vulnerability.types"
import type { PaginationInfo } from "@/types/common.types"

export const vulnerabilityKeys = {
  all: ["vulnerabilities"] as const,
  byScan: (scanId: number, params: GetVulnerabilitiesParams) =>
    [...vulnerabilityKeys.all, "scan", scanId, params] as const,
  byTarget: (targetId: number, params: GetVulnerabilitiesParams) =>
    [...vulnerabilityKeys.all, "target", targetId, params] as const,
}

export function useScanVulnerabilities(
  scanId: number,
  params?: GetVulnerabilitiesParams,
  options?: { enabled?: boolean },
) {
  const defaultParams: GetVulnerabilitiesParams = {
    page: 1,
    pageSize: 10,
    ...params,
  }

  return useQuery({
    queryKey: vulnerabilityKeys.byScan(scanId, defaultParams),
    queryFn: () =>
      VulnerabilityService.getVulnerabilitiesByScanId(scanId, defaultParams),
    enabled: options?.enabled !== undefined ? options.enabled : !!scanId,
    select: (response: any) => {
      const items = (response?.results ?? []) as any[]

      const vulnerabilities: Vulnerability[] = items.map((item) => {
        let severity = (item.severity || "info") as
          | VulnerabilitySeverity
          | "unknown"
        if (severity === "unknown") {
          severity = "info"
        }

        let cvssScore: number | undefined
        if (typeof item.cvssScore === "number") {
          cvssScore = item.cvssScore
        } else if (item.cvssScore != null) {
          const num = Number(item.cvssScore)
          cvssScore = Number.isNaN(num) ? undefined : num
        }

        const discoveredAt: string = item.discoveredAt

        return {
          id: item.id,
          title: item.vulnType || item.url || `Vulnerability #${item.id}`,
          url: item.url || "",
          description: item.description || item.rawOutput || "",
          severity: severity as VulnerabilitySeverity,
          status: "open",
          source: item.source || "scan",
          targetId: undefined,
          domainId: undefined,
          endpointId: undefined,
          cvssScore,
          cveId: undefined,
          cweId: undefined,
          proof: undefined,
          solution: undefined,
          references: [],
          discoveredAt,
          createdAt: discoveredAt,
          updatedAt: discoveredAt,
        }
      })

      const pagination: PaginationInfo = {
        total: response?.total ?? 0,
        page: response?.page ?? defaultParams.page ?? 1,
        pageSize:
          response?.pageSize ??
          response?.page_size ??
          defaultParams.pageSize ??
          10,
        totalPages:
          response?.totalPages ??
          response?.total_pages ??
          0,
      }

      return { vulnerabilities, pagination }
    },
  })
}

export function useTargetVulnerabilities(
  targetId: number,
  params?: GetVulnerabilitiesParams,
  options?: { enabled?: boolean },
) {
  const defaultParams: GetVulnerabilitiesParams = {
    page: 1,
    pageSize: 10,
    ...params,
  }

  return useQuery({
    queryKey: vulnerabilityKeys.byTarget(targetId, defaultParams),
    queryFn: () =>
      VulnerabilityService.getVulnerabilitiesByTargetId(targetId, defaultParams),
    enabled: options?.enabled !== undefined ? options.enabled : !!targetId,
    select: (response: any) => {
      const items = (response?.results ?? []) as any[]

      const vulnerabilities: Vulnerability[] = items.map((item) => {
        let severity = (item.severity || "info") as
          | VulnerabilitySeverity
          | "unknown"
        if (severity === "unknown") {
          severity = "info"
        }

        let cvssScore: number | undefined
        if (typeof item.cvssScore === "number") {
          cvssScore = item.cvssScore
        } else if (item.cvssScore != null) {
          const num = Number(item.cvssScore)
          cvssScore = Number.isNaN(num) ? undefined : num
        }

        const discoveredAt: string = item.discoveredAt

        return {
          id: item.id,
          title: item.vulnType || item.url || `Vulnerability #${item.id}`,
          description: item.description || "",
          severity: severity as VulnerabilitySeverity,
          status: "open",
          source: item.source || "scan",
          targetId: item.target ?? targetId,
          domainId: undefined,
          endpointId: undefined,
          cvssScore,
          cveId: undefined,
          cweId: undefined,
          proof: undefined,
          solution: undefined,
          references: [],
          discoveredAt,
          createdAt: discoveredAt,
          updatedAt: discoveredAt,
        }
      })

      const pagination: PaginationInfo = {
        total: response?.total ?? 0,
        page: response?.page ?? defaultParams.page ?? 1,
        pageSize:
          response?.pageSize ??
          response?.page_size ??
          defaultParams.pageSize ??
          10,
        totalPages:
          response?.totalPages ??
          response?.total_pages ??
          0,
      }

      return { vulnerabilities, pagination }
    },
  })
}
