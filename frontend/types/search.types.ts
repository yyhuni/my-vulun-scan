// 搜索结果类型
export interface SearchResult {
  id: string
  host: string
  title: string
  ip: string
  technologies: string[]
  responseHeaders: Record<string, string>
  responseBody: string
  vulnerabilities: Vulnerability[]
}

export interface Vulnerability {
  id: string
  name: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  source: string
  vulnType: string
}

// 搜索状态
export type SearchState = 'initial' | 'searching' | 'results'
