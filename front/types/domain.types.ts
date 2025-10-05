// 域名相关类型定义

// 基础域名类型
export interface Domain {
  id: number
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

// 获取域名列表响应
export interface GetDomainsResponse {
  domains: Domain[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
