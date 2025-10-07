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
   * 批量创建子域名
   * @param data - 子域名创建请求对象
   * @param data.subDomains - 子域名名称数组
   * @param data.domainId - 域名ID
   * @returns Promise<ApiResponse<CreateSubDomainsResponse>> - 创建成功后的响应
   */
  static async createSubDomains(data: {
    subDomains: string[]
    domainId: number
  }): Promise<ApiResponse<CreateSubDomainsResponse>> {
    const response = await api.post<ApiResponse<CreateSubDomainsResponse>>('/subdomains/create', {
      subDomains: data.subDomains,  // ✅ 使用驼峰命名，拦截器会自动转换为 sub_domains
      domainId: data.domainId       // ✅ 使用驼峰命名，拦截器会自动转换为 domain_id
    })
    return response.data
  }
}
