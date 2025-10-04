// 资产相关类型定义

// 资产数据类型定义
export interface Asset {
  id: number
  name: string
  type: string
  status: string
  ip?: string
  domain?: string
  port?: number
  createdAt: string
  updatedAt: string
}
