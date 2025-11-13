/**
 * WebSite 相关类型定义
 */

export interface WebSite {
  id: number
  scan?: number
  target?: number
  subdomain?: number
  url: string
  screenshot_path: string
  created_at: string
  title: string
  status_code?: number
  content_length?: number
  response_time?: number
  content_type: string
  webserver: string
  technologies?: Technology[]
}

export interface Technology {
  id: number
  name: string
  version?: string
  category?: string
}

export interface WebSiteFilters {
  url?: string
  title?: string
  status_code?: number
  webserver?: string
  content_type?: string
}

export interface WebSiteListResponse {
  results: WebSite[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
