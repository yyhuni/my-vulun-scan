export type IPProtocolVersion = "IPv4" | "IPv6"
export type IPRiskLevel = "high" | "medium" | "low"

export interface IPPortInfo {
  port: number
  service: string
}

export interface IPAddress {
  id: number
  ip: string
  subdomain: string
  protocolVersion: IPProtocolVersion
  isPrivate: boolean
  reversePointer?: string
  riskLevel: IPRiskLevel
  ports: IPPortInfo[]
  lastSeen: string
}
