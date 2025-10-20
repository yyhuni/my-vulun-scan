import { api } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api-response.types"
import type { Domain, GetDomainsParams, GetDomainsResponse, GetAllDomainsParams, GetAllDomainsResponse, GetDomainByIDResponse, BatchCreateDomainsResponse } from "@/types/domain.types"

export class DomainService {
  // ========== 域名基础操作 ==========

  /**
   * 批量创建域名
   * @param data - 域名创建请求对象
   * @param data.domains - 域名详细信息数组
   * @param data.organizationId - 组织ID
   * @returns Promise<ApiResponse<BatchCreateDomainsResponse>> - 创建统计信息
   */
  static async createDomains(data: {
    domains: Array<{
      name: string
      description?: string
    }>
    organizationId: number
  }): Promise<ApiResponse<BatchCreateDomainsResponse>> {
    const response = await api.post<ApiResponse<BatchCreateDomainsResponse>>('/domains/create', {
      domains: data.domains,
      organizationId: data.organizationId  // ✅ 使用驼峰命名，拦截器会自动转换为 organization_id
    })
    return response.data
  }

  /**
   * 获取单个域名详情
   * @param id - 域名ID
   * @returns Promise<ApiResponse<GetDomainByIDResponse>>
   */
  static async getDomainById(id: string | number): Promise<ApiResponse<GetDomainByIDResponse>> {
    const response = await api.get<ApiResponse<GetDomainByIDResponse>>(`/domains/${id}`)
    return response.data
  }

  /**
   * 更新域名信息
   * @param data - 更新请求对象
   * @param data.id - 域名ID
   * @param data.name - 域名名称（可选，不传表示不更新）
   * @param data.description - 域名描述（可选，不传表示不更新，传空字符串表示清空）
   * @returns Promise<ApiResponse<Domain>>
   */
  static async updateDomain(data: {
    id: number
    name?: string
    description?: string
  }): Promise<ApiResponse<Domain>> {
    const requestBody: any = { id: data.id }
    
    // 只传递有值的字段，undefined 会被忽略
    if (data.name !== undefined) {
      requestBody.name = data.name
    }
    if (data.description !== undefined) {
      requestBody.description = data.description
    }
    
    const response = await api.post<ApiResponse<Domain>>('/domains/update', requestBody)
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
   * @param data.organizationId - 组织ID（用于路径参数）
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
        domainIds: data.domainIds,  // 拦截器会转换为 domain_ids
      }
    )
    return response.data
  }

  /**
   * 批量删除域名（独立接口，不依赖组织）
   * @param domainIds - 域名ID数组
   * @returns Promise<ApiResponse<{ message: string; deletedCount: number }>>
   */
  static async batchDeleteDomains(
    domainIds: number[]
  ): Promise<ApiResponse<{ 
    message: string
    deletedCount: number
  }>> {
    const response = await api.post<ApiResponse<any>>(
      `/domains/batch-delete`,
      {
        domainIds,  // 拦截器会转换为 domain_ids
      }
    )
    return response.data
  }

  /**
   * 获取组织的域名列表
   * @param organizationId - 组织ID
   * @param params - 分页参数
   * @returns Promise<ApiResponse<GetDomainsResponse>>
   * @description 后端固定按更新时间降序排列
   */
  static async getDomainsByOrgId(
    organizationId: number,
    params?: {
      page?: number
      pageSize?: number
    }
  ): Promise<ApiResponse<GetDomainsResponse>> {
    const response = await api.get<ApiResponse<GetDomainsResponse>>(
      `/organizations/${organizationId}/domains`,
      {
        params: {
          page: params?.page || 1,
          pageSize: params?.pageSize || 10,
        }
      }
    )
    return response.data
  }

  /**
   * 获取所有域名列表
   * @param params - 分页参数
   * @returns Promise<ApiResponse<GetAllDomainsResponse>>
   * @description 后端固定按更新时间降序排列，不支持自定义排序
   */
  static async getAllDomains(params?: GetAllDomainsParams): Promise<ApiResponse<GetAllDomainsResponse>> {
    const response = await api.get<ApiResponse<GetAllDomainsResponse>>('/domains', {
      params: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 10,
      }
    })
    return response.data
  }

}
