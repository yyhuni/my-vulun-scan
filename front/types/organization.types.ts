// 组织相关类型定义
export interface Organization {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt?: string
  domainCount?: number
  status?: string
}
