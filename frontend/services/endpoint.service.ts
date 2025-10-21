import { api } from "@/lib/api-client"
import type { 
  Endpoint, 
  CreateEndpointRequest, 
  UpdateEndpointRequest,
  GetEndpointsRequest,
  GetEndpointsResponse,
  BatchDeleteEndpointsRequest,
  BatchDeleteEndpointsResponse
} from "@/types/endpoint.types"

export class EndpointService {
  // ========== Endpoint 基础操作 ==========
  /**
   * 批量创建 Endpoint（自动匹配，缺失则跳过）
   * @param data - Endpoint 创建请求对象
   * @param data.endpoints - Endpoint 详细信息数组
   * @returns Promise<any> - 创建成功后的 Endpoint 信息数组
   * @description 后端会自动从 URL 中提取根域名和子域名，仅对已存在的域名/子域名创建端点；若不存在将被跳过。无需手动指定任何 ID
   */
  static async createEndpoints(data: {
    endpoints: Array<CreateEndpointRequest>
  }): Promise<any> {
    // api-client.ts 会自动将驼峰转换为下划线
    const requestData = {
      endpoints: data.endpoints
    }
    
    const response = await api.post<any>('/endpoints/create/', requestData)
    return response.data
  }

  /**
   * 获取单个 Endpoint 详情
   * @param id - Endpoint ID
   * @returns Promise<Endpoint>
   */
  static async getEndpointById(id: number): Promise<Endpoint> {
    const response = await api.get<Endpoint>(`/endpoints/${id}/`)
    return response.data
  }

  /**
   * 获取 Endpoint 列表
   * @param params - 查询参数
   * @returns Promise<GetEndpointsResponse>
   */
  static async getEndpoints(params: GetEndpointsRequest): Promise<GetEndpointsResponse> {
    // api-client.ts 会自动将 params 对象的驼峰转换为下划线
    const response = await api.get<GetEndpointsResponse>('/endpoints/', {
      params
    })
    return response.data
  }

  /**
   * 根据域名ID获取 Endpoint 列表（专用路由）
   * @param domainId - 域名ID
   * @param params - 其他查询参数
   * @returns Promise<GetEndpointsResponse>
   */
  static async getEndpointsByDomainId(domainId: number, params: GetEndpointsRequest): Promise<GetEndpointsResponse> {
    // api-client.ts 会自动将 params 对象的驼峰转换为下划线
    const response = await api.get<GetEndpointsResponse>(`/domains/${domainId}/endpoints/`, {
      params
    })
    return response.data
  }

  /**
   * 根据子域名ID获取 Endpoint 列表（专用路由）
   * @param subdomainId - 子域名ID
   * @param params - 其他查询参数
   * @returns Promise<GetEndpointsResponse>
   */
  static async getEndpointsBySubdomainId(subdomainId: number, params: GetEndpointsRequest): Promise<GetEndpointsResponse> {
    // api-client.ts 会自动将 params 对象的驼峰转换为下划线
    const response = await api.get<GetEndpointsResponse>(`/subdomains/${subdomainId}/endpoints/`, {
      params
    })
    return response.data
  }

  /**
   * 删除 Endpoint
   * @param id - Endpoint ID
   * @returns Promise<void>
   */
  static async deleteEndpoint(id: number): Promise<void> {
    await api.delete(`/endpoints/${id}/`)
  }

  /**
   * 批量删除 Endpoint
   * @param data - 批量删除请求对象
   * @param data.endpointIds - Endpoint ID 列表
   * @returns Promise<BatchDeleteEndpointsResponse>
   */
  static async batchDeleteEndpoints(data: BatchDeleteEndpointsRequest): Promise<BatchDeleteEndpointsResponse> {
    // api-client.ts 会自动将请求体的驼峰转换为下划线
    const response = await api.post<BatchDeleteEndpointsResponse>('/endpoints/batch-delete/', data)
    return response.data
  }

}
