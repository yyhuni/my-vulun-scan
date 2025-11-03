/**
 * 扫描引擎类型定义
 */

// 引擎类型
export type EngineType = 
  | "comprehensive" // 全面扫描
  | "quick"        // 快速扫描
  | "custom"       // 自定义扫描

// 引擎状态
export type EngineStatus = "active" | "inactive"

// 扫描引擎接口
export interface ScanEngine {
  id: number
  name: string
  type: EngineType
  description?: string
  configuration?: string   // YAML 配置内容
  tools: string[]          // 关联的工具名称列表
  tool_ids: number[]       // 关联的工具ID列表
  is_enabled: boolean
  created_at: string
  updated_at: string
  usage_count?: number     // 使用次数
  capabilities?: string[]  // 引擎能力列表
  // 功能支持标识
  subdomain_discovery?: boolean    // 子域名发现
  waf_detection?: boolean          // WAF检测
  screenshot?: boolean             // 截图
  osint?: boolean                  // OSINT
  port_scan?: boolean              // 端口扫描
  directory_files_discovery?: boolean  // 目录和文件发现
  fetch_urls?: boolean             // 获取URLs
  vulnerability_scan?: boolean     // 漏洞扫描
}

// 创建引擎请求
export interface CreateEngineRequest {
  name: string
  type: EngineType
  description?: string
  tool_ids: number[]
  is_enabled?: boolean
}

// 更新引擎请求
export interface UpdateEngineRequest {
  name?: string
  type?: EngineType
  description?: string
  configuration?: string   // YAML 配置内容
  tool_ids?: number[]
  is_enabled?: boolean
}

// API 响应
export interface GetEnginesResponse {
  engines: ScanEngine[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

