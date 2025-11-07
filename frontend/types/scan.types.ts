/**
 * 扫描任务状态枚举
 * 与后端 ScanTaskStatus 保持完全一致
 */
export type ScanStatus = "aborted" | "failed" | "initiated" | "running" | "successful"

export interface ScanRecord {
  id: number
  domainName: string
  summary: {
    subdomains: number
    endpoints: number
    vulnerabilities: {
      total: number
      critical: number
      high: number
      medium: number
      low: number
    }
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

/**
 * 发起扫描请求参数
 */
export interface InitiateScanRequest {
  organizationId?: number  // 组织ID（与targetId二选一）
  targetId?: number        // 目标ID（与organizationId二选一）
  engine: number           // 扫描引擎ID（必填）
}

/**
 * 单个扫描任务信息
 */
export interface ScanTask {
  id: number
  target: number           // 目标ID
  engine: number           // 引擎ID
  status: ScanStatus
  createdAt: string
  updatedAt: string
}

/**
 * 发起扫描响应
 */
export interface InitiateScanResponse {
  message: string          // 成功消息
  count: number            // 创建的扫描任务数量
  scans: ScanTask[]        // 扫描任务列表
}
