import { api } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api-response.types"
import type { SubDomain, GetSubDomainsParams, GetSubDomainsResponse } from "@/types/subdomain.types"

export class SubDomainService {
  // ========== 子域名基础操作 ==========

  /**
   * 获取子域名信息(支持多种查询方式)
   * @param params - 查询参数对象
   * @param params.id - 子域名ID(查询单个子域名时使用)
   * @param params.domainId - 域名ID(按域名筛选时使用)
   * @param params.organizationId - 组织ID(按组织筛选时使用)
   * @param params.page - 当前页码，1-based
   * @param params.pageSize - 分页大小
   * @param params.sortBy - 排序字段：id, name, createdAt, updatedAt（使用驼峰命名）
   * @param params.sortOrder - 排序方向：asc, desc
   * @returns Promise<ApiResponse<SubDomain | GetSubDomainsResponse>> - 子域名信息或列表
   */
  static async getSubDomains(params?: GetSubDomainsParams): Promise<ApiResponse<SubDomain | GetSubDomainsResponse>> {
    // ✅ 使用 params 对象，拦截器会自动将驼峰转换为下划线
    const response = await api.get<ApiResponse<SubDomain | GetSubDomainsResponse>>(
      '/subdomains',
      { params }
    )
    return response.data
  }


  /**
   * 批量创建子域名
   * @param data - 子域名创建请求对象
   * @param data.subDomains - 子域名名称数组
   * @param data.domainId - 域名ID
   * @returns Promise<ApiResponse<any>> - 创建成功后的响应
   */
  static async createSubDomains(data: {
    subDomains: string[]
    domainId: number
  }): Promise<ApiResponse<any>> {
    const response = await api.post<ApiResponse<any>>('/subdomains/create', {
      subDomains: data.subDomains,  // ✅ 使用驼峰命名，拦截器会自动转换为 sub_domains
      domainId: data.domainId       // ✅ 使用驼峰命名，拦截器会自动转换为 domain_id
    })
    return response.data
  }
}
