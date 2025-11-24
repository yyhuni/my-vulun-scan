/**
 * 代理配置 API 服务
 */

import apiClient from "@/lib/api-client"
import type {
  Proxy,
  CreateProxyRequest,
  UpdateProxyRequest,
  GetProxiesResponse,
  TestProxyRequest,
  TestProxyResponse,
} from "@/types/proxy.types"

const BASE_URL = "/proxies"

/**
 * 获取代理列表
 */
export async function getProxies(params?: {
  page?: number
  pageSize?: number
  search?: string
  type?: string
  isEnabled?: boolean
}): Promise<GetProxiesResponse> {
  const response = await apiClient.get<GetProxiesResponse>(`${BASE_URL}/`, {
    params: {
      page: params?.page,
      page_size: params?.pageSize,
      search: params?.search,
      type: params?.type,
      is_enabled: params?.isEnabled,
    },
  })
  return response.data
}

/**
 * 获取单个代理
 */
export async function getProxy(id: number): Promise<Proxy> {
  const response = await apiClient.get<Proxy>(`${BASE_URL}/${id}/`)
  return response.data
}

/**
 * 创建代理
 */
export async function createProxy(data: CreateProxyRequest): Promise<Proxy> {
  const response = await apiClient.post<Proxy>(`${BASE_URL}/`, {
    name: data.name,
    type: data.type,
    host: data.host,
    port: data.port,
    username: data.username,
    password: data.password,
    is_enabled: data.isEnabled ?? true,
    description: data.description,
    test_url: data.testUrl,
  })
  return response.data
}

/**
 * 更新代理
 */
export async function updateProxy(
  id: number,
  data: UpdateProxyRequest
): Promise<Proxy> {
  const payload: Record<string, unknown> = {}
  
  if (data.name !== undefined) payload.name = data.name
  if (data.type !== undefined) payload.type = data.type
  if (data.host !== undefined) payload.host = data.host
  if (data.port !== undefined) payload.port = data.port
  if (data.username !== undefined) payload.username = data.username
  if (data.password !== undefined) payload.password = data.password
  if (data.isEnabled !== undefined) payload.is_enabled = data.isEnabled
  if (data.description !== undefined) payload.description = data.description
  if (data.testUrl !== undefined) payload.test_url = data.testUrl

  const response = await apiClient.patch<Proxy>(`${BASE_URL}/${id}/`, payload)
  return response.data
}

/**
 * 删除代理
 */
export async function deleteProxy(id: number): Promise<void> {
  await apiClient.delete(`${BASE_URL}/${id}/`)
}

/**
 * 批量删除代理
 */
export async function batchDeleteProxies(ids: number[]): Promise<void> {
  await apiClient.post(`${BASE_URL}/bulk-delete/`, { ids })
}

/**
 * 测试代理连接
 */
export async function testProxy(data: TestProxyRequest): Promise<TestProxyResponse> {
  const payload: Record<string, unknown> = {}
  
  if (data.id !== undefined) {
    payload.id = data.id
  } else {
    payload.type = data.type
    payload.host = data.host
    payload.port = data.port
    if (data.username) payload.username = data.username
    if (data.password) payload.password = data.password
  }
  
  if (data.testUrl) payload.test_url = data.testUrl

  const response = await apiClient.post<TestProxyResponse>(
    `${BASE_URL}/test/`,
    payload
  )
  return response.data
}

/**
 * 切换代理启用状态
 */
export async function toggleProxyEnabled(
  id: number,
  isEnabled: boolean
): Promise<Proxy> {
  return updateProxy(id, { isEnabled })
}
