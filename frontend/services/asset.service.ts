import { api } from "@/lib/api-client"
import type { Asset, GetAssetsParams, GetAssetsResponse, GetAllAssetsParams, GetAllAssetsResponse, GetAssetByIDResponse, BatchCreateAssetsResponse } from "@/types/asset.types"

export class AssetService {
  // ========== 资产基础操作 ==========

  /**
   * 批量创建资产
   * @param data - 资产创建请求对象
   * @param data.assets - 资产详细信息数组
   * @param data.organizationId - 组织ID
   * @returns Promise<BatchCreateAssetsResponse> - 创建统计信息
   */
  static async createAssets(data: {
    assets: Array<{
      name: string
      description?: string
    }>
    organizationId: number
  }): Promise<BatchCreateAssetsResponse> {
    const response = await api.post<BatchCreateAssetsResponse>('/assets/create/', {
      assets: data.assets,
      organizationId: data.organizationId  // ✅ 使用驼峰命名，拦截器会自动转换为 organization_id
    })
    return response.data
  }

  /**
   * 获取单个资产详情
   * @param id - 资产ID
   * @returns Promise<GetAssetByIDResponse>
   */
  static async getAssetById(id: string | number): Promise<GetAssetByIDResponse> {
    const response = await api.get<GetAssetByIDResponse>(`/assets/${id}/`)
    return response.data
  }

  /**
   * 更新资产信息（使用标准 RESTful PATCH 方法）
   * @param data - 更新请求对象
   * @param data.id - 资产ID
   * @param data.name - 资产名称（可选，不传表示不更新）
   * @param data.description - 资产描述（可选，不传表示不更新，传空字符串表示清空）
   * @returns Promise<Asset>
   */
  static async updateAsset(data: {
    id: number
    name?: string
    description?: string
  }): Promise<Asset> {
    const requestBody: any = {}
    
    // 只传递有值的字段，undefined 会被忽略
    if (data.name !== undefined) {
      requestBody.name = data.name
    }
    if (data.description !== undefined) {
      requestBody.description = data.description
    }
    
    // 使用标准 RESTful PATCH 方法
    const response = await api.patch<Asset>(`/assets/${data.id}/`, requestBody)
    return response.data
  }

  /**
   * 删除单个资产（使用标准 RESTful DELETE 方法）
   * @param id - 资产ID
   * @returns Promise<void>
   */
  static async deleteAsset(id: number): Promise<void> {
    await api.delete(`/assets/${id}/`)
  }

  /**
   * 批量从组织中移除资产
   * @param data - 批量移除请求对象
   * @param data.organizationId - 组织ID（用于路径参数）
   * @param data.assetIds - 资产ID数组
   * @returns Promise<{ message: string; successCount: number; failedCount: number }>
   */
  static async batchDeleteAssetsFromOrganization(data: {
    organizationId: number
    assetIds: number[]
  }): Promise<{ 
    message: string
    successCount: number
    failedCount: number
  }> {
    const response = await api.post<any>(
      `/organizations/${data.organizationId}/assets/batch-remove/`,
      {
        assetIds: data.assetIds,  // 拦截器会转换为 asset_ids
      }
    )
    return response.data
  }

  /**
   * 批量删除资产（独立接口，不依赖组织）
   * @param assetIds - 资产ID数组
   * @returns Promise<{ message: string; deletedAssetCount: number; deletedDomainCount: number }>
   */
  static async batchDeleteAssets(
    assetIds: number[]
  ): Promise<{ 
    message: string
    deletedAssetCount: number
    deletedDomainCount: number
  }> {
    const response = await api.post<{
      message: string
      deletedAssetCount: number
      deletedDomainCount: number
    }>(
      `/assets/batch-delete/`,
      {
        assetIds,  // 拦截器会转换为 asset_ids
      }
    )
    return response.data
  }

  /**
   * 获取组织的资产列表
   * @param organizationId - 组织ID
   * @param params - 分页参数
   * @returns Promise<GetAssetsResponse>
   * @description 后端固定按更新时间降序排列
   */
  static async getAssetsByOrgId(
    organizationId: number,
    params?: {
      page?: number
      pageSize?: number
    }
  ): Promise<GetAssetsResponse> {
    const response = await api.get<GetAssetsResponse>(
      `/organizations/${organizationId}/assets/`,
      {
        params: {
          page: params?.page || 1,
          pageSize: params?.pageSize || 10,
        }
      }
    )
    return response.data
  }

  /**
   * 获取所有资产列表
   * @param params - 分页参数
   * @returns Promise<GetAllAssetsResponse>
   * @description 后端固定按更新时间降序排列，不支持自定义排序
   */
  static async getAllAssets(params?: GetAllAssetsParams): Promise<GetAllAssetsResponse> {
    const response = await api.get<GetAllAssetsResponse>('/assets/', {
      params: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 10,
      }
    })
    return response.data
  }

  /**
   * 获取资产的域名列表
   * @param assetId - 资产ID
   * @param params - 分页参数
   * @returns Promise<GetDomainsResponse>
   */
  static async getDomainsByAssetId(
    assetId: number,
    params?: {
      page?: number
      pageSize?: number
    }
  ) {
    const response = await api.get(
      `/assets/${assetId}/domains/`,
      {
        params: {
          page: params?.page || 1,
          pageSize: params?.pageSize || 10,
        }
      }
    )
    return response.data
  }

  /**
   * 获取资产的 URL 列表
   * @param assetId - 资产ID
   * @param params - 分页参数
   * @returns Promise<GetUrlsResponse>
   */
  static async getUrlsByAssetId(
    assetId: number,
    params?: {
      page?: number
      pageSize?: number
    }
  ) {
    const response = await api.get(
      `/assets/${assetId}/endpoints/`,
      {
        params: {
          page: params?.page || 1,
          pageSize: params?.pageSize || 10,
        }
      }
    )
    return response.data
  }

}
