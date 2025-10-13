import { api } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api-response.types"
import type { 
  Endpoint, 
  CreateEndpointRequest, 
  UpdateEndpointRequest,
  GetEndpointsRequest,
  GetEndpointsResponse 
} from "@/types/endpoint.types"

export class EndpointService {
  // ========== Endpoint 基础操作 ==========
  /**
   * 批量创建 Endpoint（完全自动化）
   * @param data - Endpoint 创建请求对象
   * @param data.endpoints - Endpoint 详细信息数组
   * @returns Promise<ApiResponse<any>> - 创建成功后的 Endpoint 信息数组
   * @description 后端会自动从 URL 中提取根域名和子域名，如果不存在则自动创建。无需手动指定任何 ID
   */
  static async createEndpoints(data: {
    endpoints: Array<CreateEndpointRequest>
  }): Promise<ApiResponse<any>> {
    // api-client.ts 会自动将驼峰转换为下划线
    const requestData = {
      endpoints: data.endpoints
    }
    
    const response = await api.post<ApiResponse<any>>('/endpoints/create', requestData)
    return response.data
  }

  /**
   * 获取单个 Endpoint 详情
   * @param id - Endpoint ID
   * @returns Promise<ApiResponse<Endpoint>>
   */
  static async getEndpointById(id: number): Promise<ApiResponse<Endpoint>> {
    const response = await api.get<ApiResponse<Endpoint>>(`/endpoints/${id}`)
    return response.data
  }

  /**
   * 获取 Endpoint 列表
   * @param params - 查询参数
   * @returns Promise<ApiResponse<GetEndpointsResponse>>
   */
  static async getEndpoints(params: GetEndpointsRequest): Promise<ApiResponse<GetEndpointsResponse>> {
    // api-client.ts 会自动将 params 对象的驼峰转换为下划线
    const response = await api.get<ApiResponse<GetEndpointsResponse>>('/endpoints', {
      params
    })
    return response.data
  }

  /**
   * 根据域名ID获取 Endpoint 列表
   * @param domainId - 域名ID
   * @param params - 其他查询参数
   * @returns Promise<ApiResponse<GetEndpointsResponse>>
   */
  static async getEndpointsByDomainId(domainId: number, params: GetEndpointsRequest): Promise<ApiResponse<GetEndpointsResponse>> {
    // api-client.ts 会自动将 params 对象的驼峰转换为下划线
    const response = await api.get<ApiResponse<GetEndpointsResponse>>(`/domains/${domainId}/endpoints`, {
      params
    })
    return response.data
  }

  /**
   * 根据子域名ID获取 Endpoint 列表
   * @param subdomainId - 子域名ID
   * @param params - 其他查询参数
   * @returns Promise<ApiResponse<GetEndpointsResponse>>
   */
  static async getEndpointsBySubdomainId(subdomainId: number, params: GetEndpointsRequest): Promise<ApiResponse<GetEndpointsResponse>> {
    // api-client.ts 会自动将 params 对象的驼峰转换为下划线
    const response = await api.get<ApiResponse<GetEndpointsResponse>>(`/subdomains/${subdomainId}/endpoints`, {
      params
    })
    return response.data
  }

  /**
   * 更新 Endpoint 信息
   * @param data - 更新请求对象
   * @returns Promise<ApiResponse<Endpoint>>
   */
  static async updateEndpoint(data: UpdateEndpointRequest): Promise<ApiResponse<Endpoint>> {
    // api-client.ts 会自动将请求体的驼峰转换为下划线
    const { id, ...requestData } = data
    
    const response = await api.put<ApiResponse<Endpoint>>(`/endpoints/${id}`, requestData)
    return response.data
  }

  /**
   * 删除 Endpoint
   * @param id - Endpoint ID
   * @returns Promise<ApiResponse<any>>
   */
  static async deleteEndpoint(id: number): Promise<ApiResponse<any>> {
    const response = await api.delete<ApiResponse<any>>(`/endpoints/${id}`)
    return response.data
  }

  /**
   * 解除组织与 Endpoint 的关联
   * @param data - 解除关联请求对象
   * @param data.organizationId - 组织ID
   * @param data.endpointId - Endpoint ID
   * @returns Promise<ApiResponse<any>>
   */
  static async removeFromOrganization(data: {
    organizationId: number
    endpointId: number
  }): Promise<ApiResponse<any>> {
    const response = await api.post<ApiResponse<any>>('/endpoints/remove-from-organization', {
      organizationId: data.organizationId,
      endpointId: data.endpointId
    })
    return response.data
  }

}
