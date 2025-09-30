// 扫描相关类型定义

// 扫描任务类型
export interface ScanTask {
  id: string
  name: string
  status?: string
  type?: string
  organizationId?: string
  domainIds?: string[]
  createdAt?: string
  startedAt?: string
  completedAt?: string
  progress?: number
}

// 扫描历史类型
export interface ScanHistory {
  id: string
  type: string
  name?: string
  status: string
  organizationId?: string
  domainIds?: string[]
  createdAt: string
  startedAt?: string
  completedAt?: string
  progress?: number
  results?: any
}

// 扫描配置类型
export interface ScanConfig {
  organizationId: string
  domainIds: string[]
  scanType?: string
  scanOptions?: {
    enableSubdomainDiscovery?: boolean
    enableVulnerabilityScanning?: boolean
    enablePortScanning?: boolean
    enableDirectoryBruteforce?: boolean
    [key: string]: any
  }
}

// 扫描状态类型
export type ScanStatus = "pending" | "running" | "completed" | "failed" | "cancelled"

// 扫描类型枚举
export type ScanType = "comprehensive" | "quick" | "vulnerability" | "custom"

// 漏洞扫描相关类型
export interface Vulnerability {
  id: string
  title: string
  description: string
  severity: "高危" | "中危" | "低危"
  status: "待修复" | "处理中" | "已修复" | "已忽略"
  cvssScore?: number
  cveId?: string
  affectedComponent?: string
  discoveredAt: string
  organizationId?: string
  domainId?: string
}

// 获取组织漏洞参数
export interface GetOrganizationVulnerabilitiesParams {
  organizationId: string
  severity?: string
  status?: string
  page?: number
  pageSize?: number
}
