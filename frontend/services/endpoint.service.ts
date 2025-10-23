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
