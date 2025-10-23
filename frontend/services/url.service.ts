import { api } from "@/lib/api-client"
import type { 
  Url, 
  CreateUrlRequest, 
  UpdateUrlRequest,
  GetUrlsRequest,
  GetUrlsResponse,
  BatchDeleteUrlsRequest,
  BatchDeleteUrlsResponse
} from "@/types/url.types"

export class UrlService {


  /**
   * 获取单个 URL 详情
   * @param id - URL ID
   * @returns Promise<Url>
   * @note 暂未接入后端 API
   */
  static async getUrlById(id: number): Promise<Url> {
    // TODO: 接入后端 API
    // const response = await api.get<Url>(`/urls/${id}/`)
    // return response.data
    
    // 暂时返回模拟数据
    return {
      id,
      url: '',
      method: 'GET',
      statusCode: null,
      title: '',
      contentLength: null,
      domainId: 0,
      updatedAt: new Date().toISOString()
    }
  }

  /**
   * 获取 URL 列表
   * @param params - 查询参数
   * @returns Promise<GetUrlsResponse>
   * @note 暂未接入后端 API
   */
  static async getUrls(params: GetUrlsRequest): Promise<GetUrlsResponse> {
    // TODO: 接入后端 API
    // const response = await api.get<GetUrlsResponse>('/urls/', {
    //   params
    // })
    // return response.data
    
    // 暂时返回模拟数据
    return {
      urls: [],
      total: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      totalPages: 0
    }
  }

  /**
   * 根据域名ID获取 URL 列表（专用路由）
   * @param domainId - 域名ID
   * @param params - 其他查询参数
   * @returns Promise<GetUrlsResponse>
   * @note 暂未接入后端 API
   */
  static async getUrlsByDomainId(domainId: number, params: GetUrlsRequest): Promise<GetUrlsResponse> {
    // TODO: 接入后端 API
    // const response = await api.get<GetUrlsResponse>(`/domains/${domainId}/urls/`, {
    //   params
    // })
    // return response.data
    
    // 暂时返回模拟数据
    return {
      urls: [],
      total: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      totalPages: 0
    }
  }


  /**
   * 删除 URL
   * @param id - URL ID
   * @returns Promise<void>
   * @note 暂未接入后端 API
   */
  static async deleteUrl(id: number): Promise<void> {
    // TODO: 接入后端 API
    // await api.delete(`/urls/${id}/`)
  }

  /**
   * 批量删除 URL
   * @param data - 批量删除请求对象
   * @param data.urlIds - URL ID 列表
   * @returns Promise<BatchDeleteUrlsResponse>
   * @note 暂未接入后端 API
   */
  static async batchDeleteUrls(data: BatchDeleteUrlsRequest): Promise<BatchDeleteUrlsResponse> {
    // TODO: 接入后端 API
    // const response = await api.post<BatchDeleteUrlsResponse>('/urls/batch-delete/', data)
    // return response.data
    
    // 暂时返回模拟数据
    return {
      message: '暂未接入后端 API',
      deletedCount: 0
    }
  }

}
