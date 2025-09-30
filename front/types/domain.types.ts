// 域名相关类型定义

// 基础域名类型
export interface Domain {
  id: string
  name: string
  domainName: string
  createdAt: string
}

// 子域名类型
export interface SubDomain {
  id: string
  name?: string
  subdomain?: string
  mainDomainId?: string
  status?: string
}

// 主域名类型
export interface MainDomain {
  id: string
  name?: string
  domainName?: string
  status?: string
}

// 域名验证结果
export interface ValidationResult {
  domain?: string
  subdomain?: string
  isValid: boolean
  message?: string
}
