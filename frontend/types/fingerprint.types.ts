/**
 * 指纹相关类型定义
 */

// EHole 指纹类型
export interface EholeFingerprint {
  id: number
  cms: string
  method: string
  location: string
  keyword: string[]
  isImportant: boolean
  type: string
  createdAt: string
}

// 批量创建响应
export interface BatchCreateResponse {
  created: number
  failed: number
}

// 批量删除响应
export interface BulkDeleteResponse {
  deleted: number
}

// 指纹统计信息
export interface FingerprintStats {
  ehole: number
  goby: number
  wappalyzer: number
}
