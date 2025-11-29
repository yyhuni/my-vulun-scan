/**
 * 系统配置 API 服务
 */

import apiClient from '@/lib/api-client'
import type {
  SystemConfigResponse,
  UpdateSystemConfigRequest,
} from '@/types/system-config.types'

const BASE_URL = '/system/config'

export const systemConfigService = {
  /**
   * 获取系统配置
   */
  async getConfig(): Promise<SystemConfigResponse> {
    const response = await apiClient.get<SystemConfigResponse>(`${BASE_URL}/`)
    return response.data
  },

  /**
   * 更新系统配置
   */
  async updateConfig(data: UpdateSystemConfigRequest): Promise<SystemConfigResponse> {
    const response = await apiClient.put<SystemConfigResponse>(`${BASE_URL}/`, {
      public_ip: data.publicIp,
    })
    return response.data
  },
}
