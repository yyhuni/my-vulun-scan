import { Tool } from "./tool.types"

/**
 * 命令模型
 */
export interface Command {
  id: number
  created_at: string
  updated_at: string
  tool_id: number
  tool?: Tool
  name: string
  display_name: string
  description: string
  command_template: string
}

/**
 * 获取命令列表请求参数
 */
export interface GetCommandsRequest {
  page?: number
  pageSize?: number
  toolId?: number
}

/**
 * 获取命令列表响应
 */
export interface GetCommandsResponse {
  commands: Command[]
  page: number
  page_size: number
  total_count: number
  total_pages: number
}

/**
 * 创建命令请求
 */
export interface CreateCommandRequest {
  toolId: number
  name: string
  displayName?: string
  description?: string
  commandTemplate: string
}

/**
 * 更新命令请求
 */
export interface UpdateCommandRequest {
  name?: string
  displayName?: string
  description?: string
  commandTemplate?: string
}

/**
 * 命令响应数据
 */
export interface CommandResponseData {
  command: Command
}

/**
 * 批量删除命令响应数据
 */
export interface BatchDeleteCommandsResponseData {
  deleted_count: number
}
