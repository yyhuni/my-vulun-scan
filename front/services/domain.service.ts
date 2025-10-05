import { api } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api-response.types"
import type { Domain } from "@/types/domain.types"

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
   * 根据组织ID获取域名列表
   * @param organizationId - 组织ID
   * @returns Promise<ApiResponse<Domain[]>> - 域名列表
   */
  static async getDomainsByOrgId(organizationId: number): Promise<ApiResponse<Domain[]>> {
    const response = await api.get<ApiResponse<Domain[]>>(`/domains/list?organization_id=${organizationId}`)
    return response.data
  }
}
