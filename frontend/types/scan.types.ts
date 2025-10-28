export type ScanStatus = "pending" | "running" | "completed" | "failed"

export interface ScanRecord {
  id: number
  domainName: string
  summary: {
    subdomains: number
    endpoints: number
    vulnerabilities: number
  }
  scanEngine: string
  lastScan: string
  status: ScanStatus
  progress: number // 0-100
}

export interface GetScansParams {
  page?: number
  pageSize?: number
  status?: ScanStatus
}

export interface GetScansResponse {
  scans: ScanRecord[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
