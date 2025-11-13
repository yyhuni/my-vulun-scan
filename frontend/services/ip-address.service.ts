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

  static async deleteIPAddress(ipId: number): Promise<void> {
    await api.delete(`/ip-addresses/${ipId}/`)
  }

  static async bulkDeleteIPAddresses(ipIds: number[]): Promise<void> {
    await api.post('/ip-addresses/bulk-delete/', {
      ids: ipIds,
    })
  }
}
