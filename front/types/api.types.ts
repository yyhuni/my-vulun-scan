// 通用API响应类型
export interface ApiResponse<T = any> {
  success?: boolean;
  code?: string;
  message: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// 组织相关类型
export interface Organization {
  id: string
  name: string
  description: string
  domainCount: number
  status: "active" | "inactive"
  industry: string
  contactEmail: string
  createdAt: string
  updatedAt: string
}

// 主域名类型
export interface MainDomain {
  id: string
  name?: string // 兼容旧字段名
  mainDomainName: string
  createdAt: string
}

// 子域名类型
export interface SubDomain {
  id: string
  name?: string // 兼容旧字段名
  subDomainName: string
  mainDomainId: string
  status: "active" | "inactive" | "unknown"
  createdAt: string
  updatedAt: string
  mainDomain?: MainDomain
}

// 域名相关类型（保持向后兼容）
export interface Domain {
  id: string
  domain: string
  organizationId: string
  organizationName: string
  subdomainCount: number
  status: "active" | "inactive"
  lastScanDate: string
  sslStatus: "valid" | "expired" | "invalid"
  createdAt: string
  updatedAt: string
}

// 仪表盘统计类型
export interface DashboardStats {
  totalOrganizations: number
  totalDomains: number
  totalSubdomains: number
  activeScanTasks: number
  securityAlerts: number
  organizationGrowth: number
  domainGrowth: number
  subdomainGrowth: number
  alertGrowth: number
}

// 扫描任务类型
export interface ScanTask {
  id: string
  domainId: string
  domain: string
  organizationName: string
  status: "pending" | "running" | "completed" | "failed"
  startTime: string
  endTime?: string
  duration?: string
  findings: number
  progress: number
  createdAt: string
  updatedAt: string
}

// 安全警报类型
export interface SecurityAlert {
  id: string
  type: "high" | "medium" | "low" | "info"
  title: string
  domainId: string
  domain: string
  description: string
  severity: number
  status: "open" | "resolved"
  createdAt: string
  resolvedAt?: string
}

// 错误类型
export interface ApiError {
  code: string
  message: string
  details?: any
}
