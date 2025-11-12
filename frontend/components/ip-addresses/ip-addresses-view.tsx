"use client"

import React, { useCallback, useMemo } from "react"
import { IPAddressesDataTable } from "./ip-addresses-data-table"
import { createIPAddressColumns } from "./ip-addresses-columns"
import type { IPAddress } from "@/types/ip-address.types"

const mockIpDataset: IPAddress[] = [
  {
    id: 1,
    ip: "203.0.113.12",
    subdomain: "api.example.com",
    protocolVersion: "IPv4",
    isPrivate: false,
    reversePointer: "mail.example.com",
    riskLevel: "high",
    ports: [
      { port: 80, service: "http" },
      { port: 443, service: "https" },
      { port: 8080, service: "http-alt" },
    ],
    lastSeen: "2024-11-28T06:32:00Z",
  },
  {
    id: 2,
    ip: "198.51.100.45",
    subdomain: "cdn.example.com",
    protocolVersion: "IPv4",
    isPrivate: false,
    reversePointer: "edge.cdn.example.com",
    riskLevel: "medium",
    ports: [
      { port: 80, service: "http" },
      { port: 443, service: "https" },
    ],
    lastSeen: "2024-11-27T14:12:00Z",
  },
  {
    id: 3,
    ip: "2001:db8:abcd::10",
    subdomain: "ipv6.example.com",
    protocolVersion: "IPv6",
    isPrivate: false,
    reversePointer: "v6-gateway.example.com",
    riskLevel: "medium",
    ports: [
      { port: 443, service: "https" },
      { port: 8443, service: "https-alt" },
    ],
    lastSeen: "2024-11-25T10:02:00Z",
  },
  {
    id: 4,
    ip: "10.14.21.5",
    subdomain: "internal.example.com",
    protocolVersion: "IPv4",
    isPrivate: true,
    reversePointer: "internal-gw.local",
    riskLevel: "low",
    ports: [
      { port: 22, service: "ssh" },
      { port: 443, service: "https" },
    ],
    lastSeen: "2024-11-20T18:45:00Z",
  },
  {
    id: 5,
    ip: "203.0.113.99",
    subdomain: "files.example.com",
    protocolVersion: "IPv4",
    isPrivate: false,
    reversePointer: "files.example.com",
    riskLevel: "high",
    ports: [
      { port: 21, service: "ftp" },
      { port: 990, service: "ftps" },
      { port: 8080, service: "http-alt" },
    ],
    lastSeen: "2024-11-22T09:17:00Z",
  },
  {
    id: 6,
    ip: "fd12:3456:789a::5",
    subdomain: "beta.internal.example.com",
    protocolVersion: "IPv6",
    isPrivate: true,
    reversePointer: "beta-lab.local",
    riskLevel: "low",
    ports: [
      { port: 22, service: "ssh" },
      { port: 3389, service: "rdp" },
    ],
    lastSeen: "2024-11-18T03:10:00Z",
  },
]

export function IPAddressesView({
  targetId,
  scanId,
}: {
  targetId?: number
  scanId?: number
}) {
  const dataset = useMemo(() => {
    if (scanId) {
      return mockIpDataset.map((item, index) => ({
        ...item,
        subdomain: `${item.subdomain.replace(".example.com", "")}-scan${scanId}.example.com`,
        id: Number(`${scanId}${index}`),
      }))
    }
    return mockIpDataset
  }, [scanId])

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }, [])

  const columns = useMemo(
    () =>
      createIPAddressColumns({
        formatDate,
      }),
    [formatDate]
  )

  return (
    <IPAddressesDataTable
      data={dataset}
      columns={columns}
      searchPlaceholder="搜索 IP 或子域名..."
      searchColumn="ip"
    />
  )
}
