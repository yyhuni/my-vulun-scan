import { api } from "@/lib/api-client"
import type {
  ApiResponse,
} from "@/types/api-response.types"
import type { Organization } from "@/types/organization.types"


export class OrganizationService {
  // ========== 组织基础操作 ==========
  
  /**
   * 获取所有组织列表
   */
  static async getOrganizations(): Promise<ApiResponse<Organization[]>> {
    const response = await api.get<ApiResponse<Organization[]>>('/organizations')
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
   */
  static async updateOrganization(data: {
    id: string | number
    name: string
    description: string
  }): Promise<ApiResponse<Organization>> {
    const response = await api.post<ApiResponse<Organization>>(`/organizations/${data.id}/update`, {
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
}