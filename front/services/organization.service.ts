import { api } from "@/lib/api-client"
import type {
  ApiResponse,
  OrganizationsResponse,
} from "@/types/api-response.types"
import type { Organization } from "@/types/organization.types"
import type { Domain } from "@/types/domain.types"
import type { PaginationParams } from "@/types/common.types"


export class OrganizationService {
  // ========== 组织基础操作 ==========

  /**
   * 获取所有组织列表（支持分页和排序）
   * @param params - 分页和排序参数对象
   * @param params.page - 当前页码，1-based
   * @param params.pageSize - 分页大小，1-based
   * @param params.sortBy - 排序字段：id, name, created_at, updated_at
   * @param params.sortOrder - 排序方向：asc, desc
   * @returns Promise<ApiResponse<OrganizationsResponse<Organization>>>
   */
  static async getOrganizations(params?: PaginationParams): Promise<ApiResponse<OrganizationsResponse<Organization>>> {
    const queryParams = new URLSearchParams()
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
    const url = `/organizations${queryString ? `?${queryString}` : ''}`
    
    const response = await api.get<ApiResponse<OrganizationsResponse<Organization>>>(url)
    return response.data
  }

  /**
   * 获取单个组织详情
   */
  static async getOrganization(id: string): Promise<ApiResponse<Organization>> {
    const response = await api.get<ApiResponse<Organization>>(`/organizations/${id}`)
    return response.data
  }
  /**
   * 创建新组织
   * @param data - 组织信息对象
   * @param data.name - 组织名称
   * @param data.description - 组织描述
   * @returns Promise<ApiResponse<Organization>> - 创建成功后的组织信息对象
   */
  static async createOrganization(data: {
    name: string
    description: string
  }): Promise<ApiResponse<Organization>> {
    const response = await api.post<ApiResponse<Organization>>('/organizations/create', data)
    return response.data
  }

  /**
   * 更新组织信息
   * @param data - 组织信息对象
   * @param data.id - 组织ID，number或string类型
   * @param data.name - 组织名称
   * @param data.description - 组织描述
   * @returns Promise<ApiResponse<Organization>> - 更新成功后的组织信息对象
   */
  static async updateOrganization(data: {
    id: string | number
    name: string
    description: string
  }): Promise<ApiResponse<Organization>> {
    const response = await api.post<ApiResponse<Organization>>('/organizations/update', {
      id: data.id,
      name: data.name,
      description: data.description
    })
    return response.data
  }

  /**
   * 删除组织
   */
  static async deleteOrganization(id: number): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/organizations/delete', {
      organizationId: id  // 前端camelCase，会自动转换为后端的organization_id
    })
    return response.data
  }

  /**
   * 批量删除组织
   */
  static async batchDeleteOrganizations(organizationIds: string[]): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/organizations/batch-delete', {
      organizationIds: organizationIds  // 前端camelCase，会自动转换为后端的organization_ids
    })
    return response.data
  }

  // ========== 组织域名操作 ==========

  /**
   * 获取组织的域名列表
   */
  static async getOrganizationDomains(organizationId: string): Promise<ApiResponse<{ domains: Domain[] }>> {
    const response = await api.get<ApiResponse<{ domains: Domain[] }>>(`/organizations/${organizationId}/domains`)
    return response.data
  }

  /**
   * 批量创建域名并关联到组织
   */
  static async createDomains(data: {
    domains: { name: string; description?: string }[]
    organizationId: number
  }): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/domains/create', data)
    return response.data
  }

  /**
   * 移除组织与域名的关联
   */
  static async removeDomainFromOrganization(data: {
    organizationId: number
    domainId: number
  }): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/organizations/remove-domain', data)
    return response.data
  }
}