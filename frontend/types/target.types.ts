/**
 * Target 类型定义
 */

/**
 * 目标类型
 */
export type TargetType = 'domain' | 'ip' | 'cidr'

/**
 * 目标基础信息（用于列表显示）
 */
export interface Target {
  id: number
  name: string
  type: TargetType
  organizations: Array<{
    id: number
    name: string
  }>
  domainCount: number
  endpointCount: number
  description?: string
  updatedAt: string
  createdAt: string
  lastScanned?: string
}

/**
 * 目标列表响应类型
 */
export interface TargetsResponse {
  results: Target[]
  count: number
  next: string | null
  previous: string | null
}

/**
 * 创建目标的请求参数
 */
export interface CreateTargetRequest {
  name: string
  type: TargetType
  organizationIds: number[]
  description?: string
}

/**
 * 更新目标的请求参数
 */
export interface UpdateTargetRequest {
  name?: string
  type?: TargetType
  organizationIds?: number[]
  description?: string
}

/**
 * 批量删除目标的请求参数
 */
export interface BatchDeleteTargetsRequest {
  targetIds: number[]
}

/**
 * 批量删除目标的响应
 */
export interface BatchDeleteTargetsResponse {
  deletedCount: number
  failedIds?: number[]
}

