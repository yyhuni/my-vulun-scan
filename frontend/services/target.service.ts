/**
 * Target Service - Target management API
 */
import { api } from '@/lib/api-client'
import type {
  Target,
  TargetsResponse,
  CreateTargetRequest,
  UpdateTargetRequest,
  BatchDeleteTargetsRequest,
  BatchDeleteTargetsResponse,
  BatchCreateTargetsRequest,
  BatchCreateTargetsResponse,
} from '@/types/target.types'
import { USE_MOCK, mockDelay, getMockTargets, getMockTargetById } from '@/mock'

/**
 * Get all targets list (paginated)
 */
export async function getTargets(page = 1, pageSize = 10, search?: string): Promise<TargetsResponse> {
  if (USE_MOCK) {
    await mockDelay()
    return getMockTargets({ page, pageSize, search })
  }
  const response = await api.get<TargetsResponse>('/targets/', {
    params: {
      page,
      pageSize,
      ...(search && { search }),
    },
  })
  return response.data
}

/**
 * Get single target details
 */
export async function getTargetById(id: number): Promise<Target> {
  if (USE_MOCK) {
    await mockDelay()
    const target = getMockTargetById(id)
    if (!target) throw new Error('Target not found')
    return target
  }
  const response = await api.get<Target>(`/targets/${id}/`)
  return response.data
}

/**
 * Create target
 */
export async function createTarget(data: CreateTargetRequest): Promise<Target> {
  const response = await api.post<Target>('/targets/', data)
  return response.data
}

/**
 * Update target
 */
export async function updateTarget(id: number, data: UpdateTargetRequest): Promise<Target> {
  const response = await api.patch<Target>(`/targets/${id}/`, data)
  return response.data
}

/**
 * Delete single target (using separate DELETE API)
 */
export async function deleteTarget(id: number): Promise<{
  message: string
  targetId: number
  targetName: string
  deletedCount: number
  deletedTargets: string[]
  detail: {
    phase1: string
    phase2: string
  }
}> {
  const response = await api.delete<{
    message: string
    targetId: number
    targetName: string
    deletedCount: number
    deletedTargets: string[]
    detail: {
      phase1: string
      phase2: string
    }
  }>(`/targets/${id}/`)
  return response.data
}

/**
 * Batch delete targets
 */
export async function batchDeleteTargets(
  data: BatchDeleteTargetsRequest
): Promise<BatchDeleteTargetsResponse> {
  const response = await api.post<BatchDeleteTargetsResponse>('/targets/bulk-delete/', data)
  return response.data
}

/**
 * Batch create targets
 */
export async function batchCreateTargets(
  data: BatchCreateTargetsRequest
): Promise<BatchCreateTargetsResponse> {
  const response = await api.post<BatchCreateTargetsResponse>('/targets/batch_create/', data)
  return response.data
}

/**
 * Get target's organization list
 */
export async function getTargetOrganizations(id: number, page = 1, pageSize = 10) {
  const response = await api.get(`/targets/${id}/organizations/`, { params: { page, pageSize } })
  return response.data
}

/**
 * Link organizations to target
 */
export async function linkTargetOrganizations(
  id: number,
  organizationIds: number[]
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(`/targets/${id}/organizations/`, { organizationIds })
  return response.data
}

/**
 * Unlink target from organizations
 */
export async function unlinkTargetOrganizations(
  id: number,
  organizationIds: number[]
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(`/targets/${id}/organizations/unlink/`, { organizationIds })
  return response.data
}

/**
 * Get target's endpoint list
 */
export async function getTargetEndpoints(
  id: number,
  page = 1,
  pageSize = 10,
  filter?: string
): Promise<any> {
  const response = await api.get(`/targets/${id}/endpoints/`, {
    params: {
      page,
      pageSize,
      ...(filter && { filter }),
    },
  })
  return response.data
}

/**
 * Get target's blacklist rules
 */
export async function getTargetBlacklist(id: number): Promise<{ patterns: string[] }> {
  const response = await api.get<{ patterns: string[] }>(`/targets/${id}/blacklist/`)
  return response.data
}

/**
 * Update target's blacklist rules (full replace)
 */
export async function updateTargetBlacklist(
  id: number,
  patterns: string[]
): Promise<{ count: number }> {
  const response = await api.put<{ count: number }>(`/targets/${id}/blacklist/`, { patterns })
  return response.data
}

