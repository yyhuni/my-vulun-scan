import type { DashboardStats, ScanTask, SecurityAlert, ApiResponse, PaginatedResponse } from "@/types/api.types"
import { api } from "@/lib/api-client"

export class DashboardService {
  // 获取仪表盘统计数据
  static async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return api.get<ApiResponse<DashboardStats>>("/dashboard/stats")
  }

  // 获取扫描任务列表
  static async getScanTasks(page = 1, limit = 10, status?: string): Promise<PaginatedResponse<ScanTask>> {
    const params: Record<string, any> = { page, limit }
    if (status) {
      params.status = status
    }
    return api.get<PaginatedResponse<ScanTask>>("/scan-tasks", params)
  }

  // 获取安全警报列表
  static async getSecurityAlerts(page = 1, limit = 10, type?: string): Promise<PaginatedResponse<SecurityAlert>> {
    const params: Record<string, any> = { page, limit }
    if (type) {
      params.type = type
    }
    return api.get<PaginatedResponse<SecurityAlert>>("/security-alerts", params)
  }
}
