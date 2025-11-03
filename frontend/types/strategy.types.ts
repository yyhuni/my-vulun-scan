/**
 * 扫描策略类型定义
 */

// 策略类型
export type StrategyType = 
  | "comprehensive" // 全面扫描
  | "quick"        // 快速扫描
  | "custom"       // 自定义扫描

// 策略状态
export type StrategyStatus = "active" | "inactive"

// 扫描策略接口
export interface ScanStrategy {
  id: number
  name: string
  type: StrategyType
  description?: string
  tools: string[]          // 关联的工具名称列表
  tool_ids: number[]       // 关联的工具ID列表
  is_enabled: boolean
  created_at: string
  updated_at: string
  usage_count?: number     // 使用次数
  capabilities?: string[]  // 引擎能力列表
}

// 创建策略请求
export interface CreateStrategyRequest {
  name: string
  type: StrategyType
  description?: string
  tool_ids: number[]
  is_enabled?: boolean
}

// 更新策略请求
export interface UpdateStrategyRequest {
  name?: string
  type?: StrategyType
  description?: string
  tool_ids?: number[]
  is_enabled?: boolean
}

// API 响应
export interface GetStrategiesResponse {
  strategies: ScanStrategy[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
