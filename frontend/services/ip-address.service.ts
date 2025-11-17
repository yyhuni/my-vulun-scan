import { api } from "@/lib/api-client"
import type { GetIPAddressesParams, GetIPAddressesResponse } from "@/types/ip-address.types"

export class IPAddressService {
  static async getTargetIPAddresses(
    targetId: number,
    params?: GetIPAddressesParams
  ): Promise<GetIPAddressesResponse> {
    const response = await api.get<GetIPAddressesResponse>(`/targets/${targetId}/ip-addresses/`, {
      params: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 10,
      },
    })
    return response.data
  }

  static async getScanIPAddresses(
    scanId: number,
    params?: GetIPAddressesParams
  ): Promise<GetIPAddressesResponse> {
    const response = await api.get<GetIPAddressesResponse>(`/scans/${scanId}/ip-addresses/`, {
      params: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 10,
      },
    })
    return response.data
  }

  /** 批量删除 IP 地址（支持单个或多个） */
  static async bulkDeleteIPAddresses(ids: number[]): Promise<{
    message: string
    deletedCount: number
    requestedIds: number[]
    cascadeDeleted: Record<string, number>
  }> {
    const response = await api.post<{
      message: string
      deletedCount: number
      requestedIds: number[]
      cascadeDeleted: Record<string, number>
    }>('/ip-addresses/bulk-delete/', { ids })
    return response.data
  }

  /** 删除单个 IP 地址（复用批量删除接口） */
  static async deleteIPAddress(ipId: number): Promise<{
    message: string
    deletedCount: number
    requestedIds: number[]
    cascadeDeleted: Record<string, number>
  }> {
    return this.bulkDeleteIPAddresses([ipId])
  }
}
