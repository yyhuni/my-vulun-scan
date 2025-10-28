import { api } from '@/lib/api-client'
import type { GetScheduledScansResponse } from '@/types/scheduled-scan.types'

export async function getScheduledScans(params?: { page?: number; pageSize?: number }): Promise<GetScheduledScansResponse> {
  const res = await api.get<GetScheduledScansResponse>('/scheduled-scans/', { params })
  return res.data
}
