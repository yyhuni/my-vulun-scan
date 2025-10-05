import { api } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api-response.types"
import type { Organization, OrganizationsResponse } from "@/types/organization.types"
import type { Domain } from "@/types/domain.types"
import type { PaginationParams } from "@/types/common.types"


export class OrganizationService {
  // ========== 组织基础操作 ==========

  /**
   * 获取组织信息(支持多种查询方式)
   * @param params - 查询参数对象
   * @param params.id - 组织ID(查询单个组织时使用)
   * @param params.page - 当前页码，1-based
   * @param params.pageSize - 分页大小，1-based
   * @param params.sortBy - 排序字段：id, name, created_at, updated_at
   * @param params.sortOrder - 排序方向：asc, desc
   * @returns Promise<ApiResponse<Organization | OrganizationsResponse<Organization>>>
   */
  static async getOrganizations(params?: {
    id?: string | number
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<ApiResponse<Organization | OrganizationsResponse<Organization>>> {
    const queryParams = new URLSearchParams()
    
    if (params?.id !== undefined) {
      queryParams.append('id', params.id.toString())
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
    const url = `/organizations${queryString ? `?${queryString}` : ''}`
    
    const response = await api.get<ApiResponse<Organization | OrganizationsResponse<Organization>>>(url)
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
   * 
   * @param id - 组织ID，number类型
   * @returns Promise<ApiResponse> - 删除成功后的响应对象
   */
  static async deleteOrganization(id: number): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/organizations/delete', {
      id: id  // 后端期望字段名为 id
    })
    return response.data
  }

  /**
   * 批量删除组织
   * @param organizationIds - 组织ID数组，number类型
   * @returns Promise<ApiResponse> - 删除成功后的响应对象
   */
  static async batchDeleteOrganizations(organizationIds: number[]): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/organizations/batch-delete', {
      organization_ids: organizationIds  // 后端期望字段名为 organization_ids
    })
    return response.data
  }


}