import { api } from "@/lib/api-client"
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
   * @description 后端固定按更新时间降序排列
   * @param params - 查询参数对象
   * @returns Promise<GetSubDomainsResponse> - 子域名列表
   */
  static async getSubDomains(params?: {
    page?: number
    pageSize?: number
  }): Promise<GetSubDomainsResponse> {
    const response = await api.get<GetSubDomainsResponse>(
      '/subdomains/',
      { params }
    )
    return response.data
  }

  /**
   * 根据ID获取单个子域名
   * @param id - 子域名ID
   * @returns Promise<SubDomain> - 子域名详情
   */
  static async getSubDomainById(id: number): Promise<SubDomain> {
    const response = await api.get<SubDomain>(`/subdomains/${id}/`)
    return response.data
  }

  /**
   * 获取指定域名的子域名列表
   * @description 后端固定按更新时间降序排列
   * @param domainId - 域名ID
   * @param params - 查询参数
   * @returns Promise<GetSubDomainsResponse> - 子域名列表
   */
  static async getSubDomainsByDomain(domainId: number, params?: {
    page?: number
    pageSize?: number
  }): Promise<GetSubDomainsResponse> {
    const response = await api.get<GetSubDomainsResponse>(
      `/domains/${domainId}/subdomains/`,
      { params }
    )
    return response.data
  }

  /**
   * 获取指定组织的子域名列表
   * @description 后端固定按更新时间降序排列
   * @param organizationId - 组织ID
   * @param params - 查询参数
   * @returns Promise<GetSubDomainsResponse> - 子域名列表
   */
  static async getSubDomainsByOrganization(organizationId: number, params?: {
    page?: number
    pageSize?: number
  }): Promise<GetSubDomainsResponse> {
    const response = await api.get<GetSubDomainsResponse>(
      `/organizations/${organizationId}/subdomains/`,
      { params }
    )
    return response.data
  }


  /**
   * 为指定域名批量创建子域名（新接口 - 简化版）
   * @param data - 子域名创建请求对象
   * @param data.domainId - 域名ID（必填）
   * @param data.subdomains - 子域名列表
   * @returns Promise<CreateSubDomainsResponse> - 创建成功后的响应
   */
  static async createSubDomainsForDomain(data: {
    domainId: number
    subdomains: string[]
  }): Promise<CreateSubDomainsResponse> {
    const response = await api.post<CreateSubDomainsResponse>(`/domains/${data.domainId}/subdomains/create/`, {
      subdomains: data.subdomains  // 拦截器会转换为 subdomains (已经是数组，不需要转换)
    })
    return response.data
  }


  /**
   * 删除单个子域名
   * @param id - 子域名ID
   * @returns Promise<void>
   */
  static async deleteSubDomain(id: number): Promise<void> {
    await api.delete(`/subdomains/${id}/`)
  }

  /**
   * 批量删除子域名
   * @param subdomainIds - 子域名ID数组
   * @returns Promise<BatchDeleteSubDomainsResponse> - 批量删除响应
   */
  static async batchDeleteSubDomains(subdomainIds: number[]): Promise<BatchDeleteSubDomainsResponse> {
    const response = await api.post<BatchDeleteSubDomainsResponse>('/subdomains/batch-delete/', {
      subdomainIds  // 拦截器会转换为 subdomain_ids
    })
    return response.data
  }
}
