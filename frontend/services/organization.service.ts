import { api } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api-response.types"
import type { Organization, OrganizationsResponse } from "@/types/organization.types"
import type { Domain } from "@/types/domain.types"
import type { PaginationParams } from "@/types/common.types"


export class OrganizationService {
  // ========== 组织基础操作 ==========

  /**
   * 获取组织列表
   * @param params - 查询参数对象
   * @param params.page - 当前页码，1-based
   * @param params.pageSize - 分页大小
   * @returns Promise<ApiResponse<OrganizationsResponse<Organization>>>
   * @description 后端固定按更新时间降序排列，不支持自定义排序
   */
  static async getOrganizations(params?: {
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<OrganizationsResponse<Organization>>> {
    const response = await api.get<ApiResponse<OrganizationsResponse<Organization>>>(
      '/organizations',
      { params }
    )
    return response.data
  }

  /**
   * 获取单个组织详情
   * @param id - 组织ID
   * @returns Promise<ApiResponse<Organization>>
   */
  static async getOrganizationById(id: string | number): Promise<ApiResponse<Organization>> {
    const response = await api.get<ApiResponse<Organization>>(`/organizations/${id}`)
    return response.data
  }

  /**
   * 获取组织的域名列表
   * @param id - 组织ID
   * @param params - 查询参数
   * @returns Promise<ApiResponse<any>>
   */
  static async getOrganizationDomains(id: string | number, params?: {
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<any>> {
    const response = await api.get<ApiResponse<any>>(
      `/organizations/${id}/domains`,
      { params }
    )
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
      organizationIds  // ✅ 使用驼峰命名，拦截器会自动转换为 organization_ids
    })
    return response.data
  }


}