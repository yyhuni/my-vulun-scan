/**
 * Mock 数据 - 端点
 */
import type { Endpoint } from '@/types/endpoint.types'

export const mockEndpoints: Endpoint[] = [
  {
    id: 1,
    url: 'https://www.aliyun.com/api/v1/users',
    method: 'GET',
    statusCode: 200,
    title: '用户列表',
    contentLength: 1024,
    domainId: 1,
    domain: 'www.aliyun.com',
    updatedAt: '2024-10-20T15:30:00Z',
  },
  {
    id: 2,
    url: 'https://www.aliyun.com/api/v1/products',
    method: 'GET',
    statusCode: 200,
    title: '产品列表',
    contentLength: 2048,
    domainId: 1,
    domain: 'www.aliyun.com',
    updatedAt: '2024-10-19T14:20:00Z',
  },
  {
    id: 3,
    url: 'https://api.aliyun.com/v2/auth/login',
    method: 'POST',
    statusCode: 200,
    title: '登录接口',
    contentLength: 512,
    domainId: 2,
    domain: 'api.aliyun.com',
    updatedAt: '2024-10-18T16:45:00Z',
  },
  {
    id: 4,
    url: 'https://www.taobao.com/api/search',
    method: 'GET',
    statusCode: 200,
    title: '搜索接口',
    contentLength: 3072,
    domainId: 4,
    domain: 'www.taobao.com',
    updatedAt: '2024-10-17T12:30:00Z',
  },
  {
    id: 5,
    url: 'https://login.taobao.com/auth',
    method: 'POST',
    statusCode: 200,
    title: '认证接口',
    contentLength: 768,
    domainId: 5,
    domain: 'login.taobao.com',
    updatedAt: '2024-10-16T10:15:00Z',
  },
]

/**
 * 根据ID获取端点
 */
export function getEndpointById(id: number): Endpoint | undefined {
  return mockEndpoints.find(endpoint => endpoint.id === id)
}

/**
 * 根据资产ID获取端点列表
 */
export function getEndpointsByAssetId(assetId: number, page = 1, pageSize = 10) {
  const filtered = mockEndpoints.filter(endpoint => endpoint.assetId === assetId)
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = filtered.slice(startIndex, endIndex)
  
  return {
    endpoints: paginatedData,
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  }
}

