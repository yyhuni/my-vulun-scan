// Endpoint 专用数据类型定义
// 注意：后端返回 snake_case，但 api-client.ts 会自动转换为 camelCase

import type { BatchCreateResponse } from './api-response.types'

export interface Endpoint {
  id: number
  url: string
  method: string
  statusCode: number | null       // 后端: status_code (指针类型，可能为 null)
  title: string
  contentLength: number | null    // 后端: content_length (指针类型，可能为 null)
  domainId: number                // 后端: domain_id
  subdomainId?: number            // 后端: subdomain_id
  domain?: string
  subdomain?: string
  updatedAt: string               // 后端: updated_at
}

// Endpoint 列表请求参数
// 后端固定按更新时间降序排列
export interface GetEndpointsRequest {
  page?: number
  pageSize?: number
}

// Endpoint 列表响应数据
// 注意：后端返回 snake_case，但 api-client.ts 会自动转换为 camelCase
export interface GetEndpointsResponse {
  endpoints: Endpoint[]
  total: number
  page: number
  pageSize: number      // 后端: page_size
  totalPages: number    // 后端: total_pages
}

// 创建 Endpoint 请求参数
export interface CreateEndpointRequest {
  url: string                      // 必填
  method?: string                  // 可选
  statusCode?: number | null       // 可选
  title?: string                   // 可选
  contentLength?: number | null    // 可选
  domain?: string                  // 可选
  subdomain?: string               // 可选
}

// 创建 Endpoint 响应（继承通用批量创建响应）
export interface CreateEndpointsResponse extends BatchCreateResponse {
  // 继承的字段：message, requestedCount, createdCount, existedCount
}

// 更新 Endpoint 请求参数
export interface UpdateEndpointRequest {
  id: number
  url?: string
  method?: string
  statusCode?: number
  title?: string
  contentLength?: number
  domain?: string
  subdomain?: string
}

// 批量删除 Endpoint 请求参数
export interface BatchDeleteEndpointsRequest {
  endpointIds: number[]
}

// 批量删除 Endpoint 响应数据
export interface BatchDeleteEndpointsResponse {
  message: string
  deletedCount: number
}
