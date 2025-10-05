import { api } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api-response.types"
import type { Domain, GetDomainsResponse } from "@/types/domain.types"

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
   * 获取单个域名详情
   * @param id - 域名ID
   * @returns Promise<ApiResponse<Domain>> - 域名详情
   */
  static async getDomainById(id: string | number): Promise<ApiResponse<Domain>> {
    const response = await api.get<ApiResponse<Domain>>(`/domains/${id}`)
    return response.data
  }

  /**
   * 根据组织ID获取域名列表(支持分页和排序)
   * @param organizationId - 组织ID
   * @param params - 分页和排序参数
   * @param params.page - 页码，默认1
   * @param params.pageSize - 每页数量，默认10
   * @param params.sortBy - 排序字段: name, created_at, updated_at，默认updated_at
   * @param params.sortOrder - 排序方向: asc, desc，默认desc
   * @returns Promise<ApiResponse<GetDomainsResponse>> - 域名列表响应
   */
  static async getDomainsByOrgId(
    organizationId: number,
    params?: {
      page?: number
      pageSize?: number
      sortBy?: string
      sortOrder?: string
    }
  ): Promise<ApiResponse<GetDomainsResponse>> {
    const queryParams = new URLSearchParams({
      organization_id: organizationId.toString(),
      ...(params?.page && { page: params.page.toString() }),
      ...(params?.pageSize && { page_size: params.pageSize.toString() }),
      ...(params?.sortBy && { sort_by: params.sortBy }),
      ...(params?.sortOrder && { sort_order: params.sortOrder }),
    })
    
    const response = await api.get<ApiResponse<GetDomainsResponse>>(`/domains/list?${queryParams}`)
    return response.data
  }
}
