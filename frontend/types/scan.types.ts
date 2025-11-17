/**
 * 扫描任务状态枚举
 * 与后端 ScanTaskStatus 保持完全一致（已对齐 Prefect 术语）
 */
export type ScanStatus = "cancelled" | "cancelling" | "completed" | "crashed" | "failed" | "initiated" | "running"

export interface ScanRecord {
  id: number
  target?: number              // 目标ID（对应后端 target）
  targetName: string           // 目标名称（对应后端 targetName）
  summary: {
    subdomains: number
    websites: number
    directories: number
    endpoints: number
    ips: number
    vulnerabilities: {
      total: number
      critical: number
      high: number
      medium: number
      low: number
    }
  }
  engine?: number              // 引擎ID（对应后端 engine）
  engineName: string           // 引擎名称（对应后端 engineName）
  createdAt: string            // 创建时间（对应后端 createdAt）
  status: ScanStatus
  progress: number             // 0-100
}

export interface GetScansParams {
  page?: number
  pageSize?: number
  status?: ScanStatus
}

export interface GetScansResponse {
  results: ScanRecord[]        // 对应后端 results 字段
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
  engineId: number         // 扫描引擎ID（必填）
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
