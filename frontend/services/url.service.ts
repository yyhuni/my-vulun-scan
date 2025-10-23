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
  // ========== URL 基础操作 ==========
  /**
   * 批量创建 URL（自动匹配，缺失则跳过）
   * @param data - URL 创建请求对象
   * @param data.urls - URL 详细信息数组
   * @returns Promise<any> - 创建成功后的 URL 信息数组
   * @description 后端会自动从 URL 中提取根域名和子域名，仅对已存在的域名/子域名创建 URL；若不存在将被跳过。无需手动指定任何 ID
   * @note 暂未接入后端 API
   */
  static async createUrls(data: {
    urls: Array<CreateUrlRequest>
  }): Promise<any> {
    // TODO: 接入后端 API
    // const requestData = {
    //   urls: data.urls
    // }
    // const response = await api.post<any>('/urls/create/', requestData)
    // return response.data
    
    // 暂时返回模拟数据
    return {
      message: '暂未接入后端 API',
      requestedCount: data.urls.length,
      createdCount: 0,
      existedCount: 0
    }
  }

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
   * 根据子域名ID获取 URL 列表（专用路由）
   * @param subdomainId - 子域名ID
   * @param params - 其他查询参数
   * @returns Promise<GetUrlsResponse>
   * @note 暂未接入后端 API
   */
  static async getUrlsBySubdomainId(subdomainId: number, params: GetUrlsRequest): Promise<GetUrlsResponse> {
    // TODO: 接入后端 API
    // const response = await api.get<GetUrlsResponse>(`/subdomains/${subdomainId}/urls/`, {
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
