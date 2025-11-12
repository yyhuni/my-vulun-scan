export interface Port {
  number: number
  serviceName: string
  description: string
  isUncommon: boolean
}

export interface IPAddress {
  id: number
  ip: string
  subdomain?: string
  createdAt?: string
  reversePointer?: string
  ports?: Port[]
  // 兼容后端额外字段（无需前端展示）
  protocolVersion?: string
  isPrivate?: boolean
  riskLevel?: string
  lastSeen?: string
}

export interface GetIPAddressesParams {
  page?: number
  pageSize?: number
}

export interface GetIPAddressesResponse {
  results: IPAddress[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
