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
   * 解除组织与域名的关联
   * @param data - 解除关联请求对象
   * @param data.organizationId - 组织ID
   * @param data.domainId - 域名ID
   * @returns Promise<ApiResponse<any>>
   */
  static async removeFromOrganization(data: {
    organizationId: number
    domainId: number
  }): Promise<ApiResponse<any>> {
    const response = await api.post<ApiResponse<any>>('/domains/remove-from-organization', {
      organizationId: data.organizationId,  // ✅ 使用驼峰命名，拦截器会自动转换为 organization_id
      domainId: data.domainId  // ✅ 使用驼峰命名，拦截器会自动转换为 domain_id
    })
    return response.data
  }

}
