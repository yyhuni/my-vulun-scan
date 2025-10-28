export interface DashboardStats {
  totalTargets: number
  totalSubdomains: number
  totalEndpoints: number
  totalVulnerabilities: number
}

export interface SystemMetricPoint {
  timestamp: string
  cpu: number
  memory: number
  diskIo: number
}

export interface SystemMetricsResponse {
  points: SystemMetricPoint[]
}
