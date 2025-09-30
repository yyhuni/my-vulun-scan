// 域名相关类型定义

// 基础域名类型
export interface Domain {
  id: number
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

// 子域名类型
export interface SubDomain {
  id: number
  name: string
  domainId: number
  createdAt: string
  updatedAt: string
}

// 主域名类型
export interface MainDomain {
  id: number
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

// 域名验证结果
export interface ValidationResult {
  domain?: string
  subdomain?: string
  isValid: boolean
  message?: string
}
