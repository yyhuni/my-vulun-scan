import { api } from '@/lib/api-client'
import type { GetScansParams, GetScansResponse } from '@/types/scan.types'

export async function getScans(params?: GetScansParams): Promise<GetScansResponse> {
  const res = await api.get<GetScansResponse>('/scans/', { params })
  return res.data
}
