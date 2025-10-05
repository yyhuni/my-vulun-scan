import { api } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api-response.types"
import type { Domain, GetDomainsParams, GetDomainsResponse } from "@/types/domain.types"

export class DomainService {
  // ========== 域名基础操作 ==========

  /**
   * 批量创建域名
   * @param data - 域名创建请求对象
   * @param data.domains - 域名详细信息数组
   * @param data.organizationId - 组织ID
   * @returns Promise<ApiResponse<Domain[]>> - 创建成功后的域名信息数组
   */
  static async createDomains(data: {
    domains: Array<{
      name: string
      description?: string
    }>
    organizationId: number
  }): Promise<ApiResponse<Domain[]>> {
    const response = await api.post<ApiResponse<Domain[]>>('/domains/create', {
      domains: data.domains,
      organization_id: data.organizationId
    })
    return response.data
  }

  /**
   * 获取域名信息(支持多种查询方式)
   * @param params - 查询参数对象
   * @param params.id - 域名ID(查询单个域名时使用)
   * @param params.organizationId - 组织ID(按组织筛选时使用)
   * @param params.page - 当前页码，1-based
   * @param params.pageSize - 分页大小
   * @param params.sortBy - 排序字段: name, created_at, updated_at
   * @param params.sortOrder - 排序方向: asc, desc
   * @returns Promise<ApiResponse<Domain | GetDomainsResponse>> - 域名信息或列表
   */
  static async getDomains(params?: {
    id?: string | number
    organizationId?: number
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<ApiResponse<Domain | GetDomainsResponse>> {
    const queryParams = new URLSearchParams()
    
    if (params?.id !== undefined) {
      queryParams.append('id', params.id.toString())
    }
    if (params?.organizationId !== undefined) {
      queryParams.append('organization_id', params.organizationId.toString())
    }
    if (params?.page !== undefined) {
      queryParams.append('page', params.page.toString())
    }
    if (params?.pageSize !== undefined) {
      queryParams.append('page_size', params.pageSize.toString())
    }
    if (params?.sortBy !== undefined) {
      queryParams.append('sort_by', params.sortBy)
    }
    if (params?.sortOrder !== undefined) {
      queryParams.append('sort_order', params.sortOrder)
    }
    
    const queryString = queryParams.toString()
    const url = `/domains${queryString ? `?${queryString}` : ''}`
    
    const response = await api.get<ApiResponse<Domain | GetDomainsResponse>>(url)
    return response.data
  }

}
