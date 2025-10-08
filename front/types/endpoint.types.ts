// Endpoint 专用数据类型定义

export interface Endpoint {
  id: number
  url: string
  method: string
  statusCode: number
  title: string
  contentLength: number
  domain: string
  subdomain?: string
  createdAt: string
  updatedAt: string
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
export interface GetEndpointsResponse {
  data: Endpoint[]
  total: number
  page: number
  pageSize: number
}

// 创建 Endpoint 请求参数
export interface CreateEndpointRequest {
  url: string
  method: string
  statusCode: number
  title: string
  contentLength: number
  domain: string
  subdomain?: string
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
