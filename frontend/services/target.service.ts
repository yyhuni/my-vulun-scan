/**
 * Target Service - 目标管理 API
 */
import { api } from '@/lib/api-client'
import type {
  Target,
  TargetsResponse,
  CreateTargetRequest,
  UpdateTargetRequest,
  BatchDeleteTargetsRequest,
  BatchDeleteTargetsResponse,
} from '@/types/target.types'

/**
 * 获取所有目标列表（分页）
 */
export async function getTargets(page = 1, pageSize = 10): Promise<TargetsResponse> {
  const response = await api.get<TargetsResponse>('/targets/', { params: { page, pageSize } })
  return response.data
}

/**
 * 获取单个目标详情
 */
export async function getTargetById(id: number): Promise<Target> {
  const response = await api.get<Target>(`/targets/${id}/`)
  return response.data
}

/**
 * 创建目标
 */
export async function createTarget(data: CreateTargetRequest): Promise<Target> {
  const response = await api.post<Target>('/targets/', data)
  return response.data
}

/**
 * 更新目标
 */
export async function updateTarget(id: number, data: UpdateTargetRequest): Promise<Target> {
  const response = await api.patch<Target>(`/targets/${id}/`, data)
  return response.data
}

/**
 * 删除单个目标
 */
export async function deleteTarget(id: number): Promise<void> {
  await api.delete(`/targets/${id}/`)
}

/**
 * 批量删除目标
 */
export async function batchDeleteTargets(
  data: BatchDeleteTargetsRequest
): Promise<BatchDeleteTargetsResponse> {
  const response = await api.post<BatchDeleteTargetsResponse>('/targets/batch-delete/', data)
  return response.data
}

/**
 * 获取目标的组织列表
 */
export async function getTargetOrganizations(id: number, page = 1, pageSize = 10) {
  const response = await api.get(`/targets/${id}/organizations/`, { params: { page, pageSize } })
  return response.data
}

/**
 * 为目标关联组织
 */
export async function linkTargetOrganizations(
  id: number,
  organizationIds: number[]
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(`/targets/${id}/organizations/`, { organizationIds })
  return response.data
}

/**
 * 取消目标与组织的关联
 */
export async function unlinkTargetOrganizations(
  id: number,
  organizationIds: number[]
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(`/targets/${id}/organizations/unlink/`, { organizationIds })
  return response.data
}

/**
 * 获取目标的域名列表
 */
export async function getTargetDomains(
  id: number,
  page = 1,
  pageSize = 10
): Promise<any> {
  const response = await api.get(`/targets/${id}/domains/`, { params: { page, pageSize } })
  return response.data
}

/**
 * 获取目标的端点列表
 */
export async function getTargetEndpoints(
  id: number,
  page = 1,
  pageSize = 10
): Promise<any> {
  const response = await api.get(`/targets/${id}/endpoints/`, { params: { page, pageSize } })
  return response.data
}

