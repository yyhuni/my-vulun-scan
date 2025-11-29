/**
 * 系统配置类型定义
 */

// 系统配置响应
export interface SystemConfigResponse {
  publicIp: string
}

// 更新系统配置请求
export interface UpdateSystemConfigRequest {
  publicIp: string
}
