import { api } from "@/lib/api-client"
import type { 
  ApiResponse, 
  Organization, 
  SubDomain 
} from "@/types/api.types"

// 响应数据类型（简化复杂的泛型）
type DomainsResponse = ApiResponse<{ domains: any[] }>
type SubDomainsResponse = ApiResponse<{
  subDomains: SubDomain[]
  total?: number
  page?: number
  pageSize?: number
}>


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
   * 删除组织
   */
  static async deleteOrganization(id: string): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/organizations/delete', {
      organizationId: id  // 前端camelCase，会自动转换为后端的organization_id
    })
    return response.data
  }

  // ========== 主域名相关操作 ==========

  /**
   * 获取组织的域名列表
   */
  static async getOrganizationDomains(organizationId: string): Promise<DomainsResponse> {
    const response = await api.get<DomainsResponse>(`/organizations/${organizationId}/domains`)
    return response.data
  }

  /**
   * 为组织创建域名
   */
  static async createDomains(data: {
    domains: Array<{
      name: string
      h1TeamHandle?: string
      description?: string
      cidrRange?: string
    }>
    organizationId: number   // 后端期望数字类型
  }): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/assets/domains/create', {
      domains: data.domains,
      organization_id: data.organizationId
    })
    return response.data
  }

  /**
   * 从组织中移除域名关联
   */
  static async removeDomainFromOrganization(data: {
    organizationId: number   // 后端期望数字类型
    domainId: number         // 后端期望数字类型
  }): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/organizations/remove-domain', {
      organization_id: data.organizationId,
      domain_id: data.domainId
    })
    return response.data
  }

  // ========== 子域名相关操作 ==========

  /**
   * 获取组织的子域名列表
   */
  static async getOrganizationSubDomains(
    organizationId: string, 
    params?: { page?: number; pageSize?: number }
  ): Promise<SubDomainsResponse> {
    const response = await api.get<SubDomainsResponse>(
      `/organizations/${organizationId}/sub-domains`,
      { params }
    )
    return response.data
  }

  /**
   * 创建子域名
   */
  static async createSubDomains(data: {
    subDomains: string[]     // 前端camelCase，会自动转换为后端的sub_domains
    mainDomainId: string     // 前端camelCase，会自动转换为后端的main_domain_id
    status?: string
  }): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/assets/sub-domains/create', data)
    return response.data
  }

  // ========== 统计和分析 ==========

  /**
   * 获取组织域名统计信息
   */
  static async getOrganizationStats(organizationId: string): Promise<ApiResponse> {
    const response = await api.get<ApiResponse>(`/assets/organizations/${organizationId}/stats`)
    return response.data
  }

  /**
   * 获取组织扫描历史
   */
  static async getOrganizationScanHistory(
    organizationId: string,
    params?: { page?: number; pageSize?: number; status?: string }
  ): Promise<PaginatedResponse<any>> {
    const response = await api.get<PaginatedResponse<any>>(
      `/assets/organizations/${organizationId}/scan-history`,
      { params }
    )
    return response.data
  }

  /**
   * 获取组织漏洞列表
   */
  static async getOrganizationVulnerabilities(
    organizationId: string,
    params?: { page?: number; pageSize?: number; severity?: string; status?: string }
  ): Promise<PaginatedResponse<any>> {
    const response = await api.get<PaginatedResponse<any>>(
      `/assets/organizations/${organizationId}/vulnerabilities`,
      { params }
    )
    return response.data
  }
}
