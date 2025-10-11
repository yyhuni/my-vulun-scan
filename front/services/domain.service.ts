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
      organizationId: data.organizationId  // ✅ 使用驼峰命名，拦截器会自动转换为 organization_id
    })
    return response.data
  }

  /**
   * 获取单个域名详情
   * @param id - 域名ID
   * @returns Promise<ApiResponse<Domain>>
   */
  static async getDomainById(id: string | number): Promise<ApiResponse<Domain>> {
    const response = await api.get<ApiResponse<Domain>>(`/domains/${id}`)
    return response.data
  }

  /**
   * 更新域名信息
   * @param data - 更新请求对象
   * @param data.id - 域名ID
   * @param data.name - 域名名称
   * @param data.description - 域名描述
   * @returns Promise<ApiResponse<Domain>>
   */
  static async updateDomain(data: {
    id: number
    name: string
    description?: string
  }): Promise<ApiResponse<Domain>> {
    const response = await api.post<ApiResponse<Domain>>('/domains/update', {
      id: data.id,
      name: data.name,
      description: data.description || ''
    })
    return response.data
  }

  /**
   * 从组织中移除域名
   * @param data - 移除请求对象
   * @param data.organizationId - 组织ID
   * @param data.domainId - 域名ID
   * @returns Promise<ApiResponse<any>>
   */
  static async deleteDomainFromOrganization(data: {
    organizationId: number
    domainId: number
  }): Promise<ApiResponse<any>> {
    const response = await api.delete<ApiResponse<any>>(
      `/organizations/${data.organizationId}/domains/${data.domainId}`
    )
    return response.data
  }

  /**
   * 批量从组织中移除域名
   * @param data - 批量移除请求对象
   * @param data.organizationId - 组织ID
   * @param data.domainIds - 域名ID数组
   * @returns Promise<ApiResponse<{ message: string; successCount: number; failedCount: number }>>
   */
  static async batchDeleteDomainsFromOrganization(data: {
    organizationId: number
    domainIds: number[]
  }): Promise<ApiResponse<{ 
    message: string
    successCount: number
    failedCount: number
  }>> {
    const response = await api.post<ApiResponse<any>>(
      `/organizations/${data.organizationId}/domains/batch-remove`,
      {
        organizationId: data.organizationId,  // 拦截器会转换为 organization_id
        domainIds: data.domainIds,            // 拦截器会转换为 domain_ids
      }
    )
    return response.data
  }

}
