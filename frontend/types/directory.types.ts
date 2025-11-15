/**
 * Directory 相关类型定义
 */

export interface Directory {
  id: number
  website: number
  target?: number
  scan?: number
  url: string
  status: number | null
  length: number | null
  words: number | null
  lines: number | null
  contentType: string
  duration: number | null
  createdAt: string
}

export interface DirectoryFilters {
  url?: string
  status?: number
  contentType?: string
}

export interface DirectoryListResponse {
  results: Directory[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
