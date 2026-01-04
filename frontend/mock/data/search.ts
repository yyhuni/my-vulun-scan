import type {
  SearchResponse,
  WebsiteSearchResult,
  EndpointSearchResult,
  AssetType,
} from '@/types/search.types'
import { mockWebsites } from './websites'
import { mockEndpoints } from './endpoints'

// 将 Website 转换为搜索结果格式
function websiteToSearchResult(website: typeof mockWebsites[0]): WebsiteSearchResult {
  return {
    id: website.id,
    url: website.url,
    host: website.host,
    title: website.title,
    technologies: website.tech || [],
    statusCode: website.statusCode,
    contentLength: website.contentLength,
    contentType: website.contentType,
    webserver: website.webserver,
    location: website.location,
    vhost: website.vhost,
    responseHeaders: {},
    responseBody: website.responseBody || '',
    createdAt: website.createdAt,
    targetId: website.target ?? 1,
    vulnerabilities: [],
  }
}

// 将 Endpoint 转换为搜索结果格式
function endpointToSearchResult(endpoint: typeof mockEndpoints[0]): EndpointSearchResult {
  return {
    id: endpoint.id,
    url: endpoint.url,
    host: endpoint.host || '',
    title: endpoint.title,
    technologies: endpoint.tech || [],
    statusCode: endpoint.statusCode,
    contentLength: endpoint.contentLength,
    contentType: endpoint.contentType || '',
    webserver: endpoint.webserver || '',
    location: endpoint.location || '',
    vhost: null,
    responseHeaders: {},
    responseBody: '',
    createdAt: endpoint.createdAt ?? null,
    targetId: 1,
    matchedGfPatterns: endpoint.gfPatterns || [],
  }
}

// 解析搜索表达式
function parseSearchQuery(query: string): { field: string; operator: string; value: string }[] {
  const conditions: { field: string; operator: string; value: string }[] = []
  
  // 简单解析：field="value" 或 field=="value" 或 field!="value"
  const regex = /(\w+)(==|!=|=)"([^"]+)"/g
  let match
  while ((match = regex.exec(query)) !== null) {
    conditions.push({
      field: match[1],
      operator: match[2],
      value: match[3],
    })
  }
  
  return conditions
}

// 检查记录是否匹配条件
function matchesConditions(
  record: WebsiteSearchResult | EndpointSearchResult,
  conditions: { field: string; operator: string; value: string }[]
): boolean {
  if (conditions.length === 0) return true
  
  return conditions.every(cond => {
    let fieldValue: string | number | null = null
    
    switch (cond.field) {
      case 'host':
        fieldValue = record.host
        break
      case 'url':
        fieldValue = record.url
        break
      case 'title':
        fieldValue = record.title
        break
      case 'tech':
        fieldValue = record.technologies.join(',')
        break
      case 'status':
        fieldValue = String(record.statusCode)
        break
      default:
        return true
    }
    
    if (fieldValue === null) return false
    const strValue = String(fieldValue).toLowerCase()
    const searchValue = cond.value.toLowerCase()
    
    switch (cond.operator) {
      case '=':
        return strValue.includes(searchValue)
      case '==':
        return strValue === searchValue
      case '!=':
        return !strValue.includes(searchValue)
      default:
        return true
    }
  })
}

export function getMockSearchResults(params: {
  q?: string
  asset_type?: AssetType
  page?: number
  pageSize?: number
}): SearchResponse {
  const { q = '', asset_type = 'website', page = 1, pageSize = 10 } = params
  
  const conditions = parseSearchQuery(q)
  
  let results: (WebsiteSearchResult | EndpointSearchResult)[]
  
  if (asset_type === 'website') {
    results = mockWebsites
      .map(websiteToSearchResult)
      .filter(r => matchesConditions(r, conditions))
  } else {
    results = mockEndpoints
      .map(endpointToSearchResult)
      .filter(r => matchesConditions(r, conditions))
  }
  
  const total = results.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const paginatedResults = results.slice(start, start + pageSize)
  
  return {
    results: paginatedResults,
    total,
    page,
    pageSize,
    totalPages,
    assetType: asset_type,
  }
}
