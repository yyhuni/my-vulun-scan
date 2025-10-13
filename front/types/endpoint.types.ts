// Endpoint 专用数据类型定义
// 注意：后端返回 snake_case，但 api-client.ts 会自动转换为 camelCase

export interface Endpoint {
  id: number
  url: string
  method: string
  statusCode: number      // 后端: status_code
  title: string
  contentLength: number   // 后端: content_length
  domainId: number        // 后端: domain_id
  subdomainId?: number    // 后端: subdomain_id
  domain?: string
  subdomain?: string
  createdAt: string       // 后端: created_at
  updatedAt: string       // 后端: updated_at
}

// Endpoint 列表查询请求参数
export interface GetEndpointsRequest {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  domainId?: number
  subdomainId?: number
  method?: string
  statusCode?: number
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
