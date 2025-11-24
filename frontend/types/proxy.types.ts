/**
 * 代理配置类型定义
 */

// 代理类型
export type ProxyType = "http" | "https" | "socks4" | "socks5"

// 代理配置接口
export interface Proxy {
  id: number
  name: string                // 代理名称
  type: ProxyType             // 代理类型
  host: string                // 代理主机
  port: number                // 代理端口
  username?: string           // 用户名（可选）
  password?: string           // 密码（可选，响应中不返回）
  isEnabled: boolean          // 是否启用
  description?: string        // 描述
  testUrl?: string            // 测试 URL
  lastTestedAt?: string       // 最后测试时间
  lastTestResult?: boolean    // 最后测试结果
  createdAt: string           // 创建时间
  updatedAt: string           // 更新时间
}

// 创建代理请求
export interface CreateProxyRequest {
  name: string
  type: ProxyType
  host: string
  port: number
  username?: string
  password?: string
  isEnabled?: boolean
  description?: string
  testUrl?: string
}

// 更新代理请求
export interface UpdateProxyRequest {
  name?: string
  type?: ProxyType
  host?: string
  port?: number
  username?: string
  password?: string
  isEnabled?: boolean
  description?: string
  testUrl?: string
}

// 测试代理请求
export interface TestProxyRequest {
  id?: number                 // 测试已有代理
  // 或者直接测试配置
  type?: ProxyType
  host?: string
  port?: number
  username?: string
  password?: string
  testUrl?: string
}

// 测试代理响应
export interface TestProxyResponse {
  success: boolean
  message: string
  responseTime?: number       // 响应时间（毫秒）
}

// API 响应
export interface GetProxiesResponse {
  results: Proxy[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 代理类型选项
export const PROXY_TYPE_OPTIONS: { value: ProxyType; label: string }[] = [
  { value: "http", label: "HTTP" },
  { value: "https", label: "HTTPS" },
  { value: "socks4", label: "SOCKS4" },
  { value: "socks5", label: "SOCKS5" },
]

// 代理类型标签映射
export const PROXY_TYPE_LABELS: Record<ProxyType, string> = {
  http: "HTTP",
  https: "HTTPS",
  socks4: "SOCKS4",
  socks5: "SOCKS5",
}
