import { api } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api-response.types"
import type { SubDomain, GetSubDomainsParams, GetSubDomainsResponse, CreateSubDomainsResponse } from "@/types/subdomain.types"

export class SubDomainService {
  // ========== 子域名基础操作 ==========

  /**
   * 获取所有子域名列表
   * @param params - 查询参数对象
   * @returns Promise<ApiResponse<GetSubDomainsResponse>> - 子域名列表
   */
  static async getSubDomains(params?: {
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: string
  }): Promise<ApiResponse<GetSubDomainsResponse>> {
    const response = await api.get<ApiResponse<GetSubDomainsResponse>>(
      '/subdomains',
      { params }
    )
    return response.data
  }

  /**
   * 根据ID获取单个子域名
   * @param id - 子域名ID
   * @returns Promise<ApiResponse<SubDomain>> - 子域名详情
   */
  static async getSubDomainById(id: number): Promise<ApiResponse<SubDomain>> {
    const response = await api.get<ApiResponse<SubDomain>>(`/subdomains/${id}`)
    return response.data
  }

  /**
   * 根据域名ID获取子域名列表
   * @param domainId - 域名ID
   * @param params - 查询参数
   * @returns Promise<ApiResponse<GetSubDomainsResponse>> - 子域名列表
   */
  static async getSubDomainsByDomain(domainId: number, params?: {
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: string
  }): Promise<ApiResponse<GetSubDomainsResponse>> {
    const response = await api.get<ApiResponse<GetSubDomainsResponse>>(
      `/domains/${domainId}/subdomains`,
      { params }
    )
    return response.data
  }

  /**
   * 根据组织ID获取子域名列表
   * @param organizationId - 组织ID
   * @param params - 查询参数
   * @returns Promise<ApiResponse<GetSubDomainsResponse>> - 子域名列表
   */
  static async getSubDomainsByOrganization(organizationId: number, params?: {
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: string
  }): Promise<ApiResponse<GetSubDomainsResponse>> {
    const response = await api.get<ApiResponse<GetSubDomainsResponse>>(
      `/organizations/${organizationId}/subdomains`,
      { params }
    )
    return response.data
  }


  /**
   * 批量创建子域名（支持域名分组）
   * @param data - 子域名创建请求对象
   * @param data.organizationId - 组织ID（必填）
   * @param data.domainGroups - 域名分组数组，每个分组包含根域名和子域名列表
   * @returns Promise<ApiResponse<CreateSubDomainsResponse>> - 创建成功后的响应
   */
  static async createSubDomains(data: {
    organizationId: number
    domainGroups: Array<{
      rootDomain: string
      subdomains: string[]
    }>
  }): Promise<ApiResponse<CreateSubDomainsResponse>> {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 SubDomainService.createSubDomains 接收到的数据:', data)
      console.log('🔍 准备发送的请求体:', { 
        organizationId: data.organizationId,
        domainGroups: data.domainGroups 
      })
    }
    
    const response = await api.post<ApiResponse<CreateSubDomainsResponse>>('/subdomains/create', {
      organizationId: data.organizationId,  // ✅ 组织ID（拦截器会转换为 organization_id）
      domainGroups: data.domainGroups       // ✅ 域名分组（拦截器会转换为 domain_groups）
    })
    return response.data
  }
}
