// 资产相关类型定义

// 主资产(Domain)数据类型定义
export interface Asset {
  id: number
  name: string
  description?: string
  type?: string
  status?: string
  ip?: string
  domain?: string
  port?: number
  createdAt: string
  updatedAt: string
}

