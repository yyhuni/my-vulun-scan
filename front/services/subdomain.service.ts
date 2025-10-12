import { api } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api-response.types"
import type { 
  SubDomain, 
  GetSubDomainsParams, 
  GetSubDomainsResponse, 
  CreateSubDomainsResponse,
  BatchDeleteSubDomainsResponse
} from "@/types/subdomain.types"

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
   * 为指定域名批量创建子域名（新接口 - 简化版）
   * @param data - 子域名创建请求对象
   * @param data.domainId - 域名ID（必填）
   * @param data.subdomains - 子域名列表
   * @returns Promise<ApiResponse<CreateSubDomainsResponse>> - 创建成功后的响应
   */
  static async createSubDomainsForDomain(data: {
    domainId: number
    subdomains: string[]
  }): Promise<ApiResponse<CreateSubDomainsResponse>> {
    const response = await api.post<ApiResponse<CreateSubDomainsResponse>>(`/domains/${data.domainId}/subdomains/create`, {
      subdomains: data.subdomains  // 拦截器会转换为 subdomains (已经是数组，不需要转换)
    })
    return response.data
  }


  /**
   * 删除单个子域名
   * @param id - 子域名ID
   * @returns Promise<ApiResponse<SubDomain>> - 被删除的子域名信息
   */
  static async deleteSubDomain(id: number): Promise<ApiResponse<SubDomain>> {
    const response = await api.delete<ApiResponse<SubDomain>>(`/subdomains/${id}`)
    return response.data
  }

  /**
   * 批量删除子域名
   * @param subdomainIds - 子域名ID数组
   * @returns Promise<ApiResponse<BatchDeleteSubDomainsResponse>> - 批量删除响应
   */
  static async batchDeleteSubDomains(subdomainIds: number[]): Promise<ApiResponse<BatchDeleteSubDomainsResponse>> {
    const response = await api.post<ApiResponse<BatchDeleteSubDomainsResponse>>('/subdomains/batch-delete', {
      subdomainIds  // 拦截器会转换为 subdomain_ids
    })
    return response.data
  }
}
