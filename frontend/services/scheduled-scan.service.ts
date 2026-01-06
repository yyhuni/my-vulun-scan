import { api } from '@/lib/api-client'
import type {
  GetScheduledScansResponse,
  ScheduledScan,
  CreateScheduledScanRequest,
  UpdateScheduledScanRequest
} from '@/types/scheduled-scan.types'
import { USE_MOCK, mockDelay, getMockScheduledScans, getMockScheduledScanById } from '@/mock'

/**
 * Get scheduled scan list
 */
export async function getScheduledScans(params?: { 
  page?: number
  pageSize?: number
  search?: string
  targetId?: number
  organizationId?: number 
}): Promise<GetScheduledScansResponse> {
  if (USE_MOCK) {
    await mockDelay()
    return getMockScheduledScans(params)
  }
  // Convert camelCase to snake_case for query params (djangorestframework-camel-case doesn't convert query params)
  const apiParams: Record<string, unknown> = {}
  if (params?.page) apiParams.page = params.page
  if (params?.pageSize) apiParams.pageSize = params.pageSize
  if (params?.search) apiParams.search = params.search
  if (params?.targetId) apiParams.target_id = params.targetId
  if (params?.organizationId) apiParams.organization_id = params.organizationId
  
  const res = await api.get<GetScheduledScansResponse>('/scheduled-scans/', { params: apiParams })
  return res.data
}

/**
 * Get scheduled scan details
 */
export async function getScheduledScan(id: number): Promise<ScheduledScan> {
  if (USE_MOCK) {
    await mockDelay()
    const scan = getMockScheduledScanById(id)
    if (!scan) throw new Error('Scheduled scan not found')
    return scan
  }
  const res = await api.get<ScheduledScan>(`/scheduled-scans/${id}/`)
  return res.data
}

/**
 * Create scheduled scan
 */
export async function createScheduledScan(data: CreateScheduledScanRequest): Promise<{
  message: string
  scheduledScan: ScheduledScan
}> {
  const res = await api.post<{ message: string; scheduledScan: ScheduledScan }>('/scheduled-scans/', data)
  return res.data
}

/**
 * Update scheduled scan
 */
export async function updateScheduledScan(id: number, data: UpdateScheduledScanRequest): Promise<{
  message: string
  scheduledScan: ScheduledScan
}> {
  const res = await api.put<{ message: string; scheduledScan: ScheduledScan }>(`/scheduled-scans/${id}/`, data)
  return res.data
}

/**
 * Delete scheduled scan
 */
export async function deleteScheduledScan(id: number): Promise<{ message: string; id: number }> {
  const res = await api.delete<{ message: string; id: number }>(`/scheduled-scans/${id}/`)
  return res.data
}

/**
 * Toggle scheduled scan enabled status
 */
export async function toggleScheduledScan(id: number, isEnabled: boolean): Promise<{
  message: string
  scheduledScan: ScheduledScan
}> {
  const res = await api.post<{ message: string; scheduledScan: ScheduledScan }>(
    `/scheduled-scans/${id}/toggle/`,
    { isEnabled }
  )
  return res.data
}

