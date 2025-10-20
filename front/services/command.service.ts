import api from "@/lib/api-client"
import type { ApiResponse } from "@/types/api-response.types"
import type {
  Command,
  GetCommandsRequest,
  GetCommandsResponse,
  CreateCommandRequest,
  UpdateCommandRequest,
  CommandResponseData,
  BatchDeleteCommandsResponseData,
} from "@/types/command.types"

/**
 * 命令服务
 */
export class CommandService {
  /**
   * 获取命令列表
   */
  static async getCommands(
    params: GetCommandsRequest = {}
  ): Promise<ApiResponse<GetCommandsResponse>> {
    const response = await api.get<ApiResponse<GetCommandsResponse>>(
      "/api/v1/commands",
      { params }
    )
    return response.data
  }

  /**
   * 获取单个命令
   */
  static async getCommandById(id: number): Promise<ApiResponse<CommandResponseData>> {
    const response = await api.get<ApiResponse<CommandResponseData>>(
      `/api/v1/commands/${id}`
    )
    return response.data
  }

  /**
   * 创建命令
   */
  static async createCommand(
    data: CreateCommandRequest
  ): Promise<ApiResponse<CommandResponseData>> {
    const response = await api.post<ApiResponse<CommandResponseData>>(
      "/api/v1/commands/create",
      data
    )
    return response.data
  }

  /**
   * 更新命令
   */
  static async updateCommand(
    id: number,
    data: UpdateCommandRequest
  ): Promise<ApiResponse<CommandResponseData>> {
    const response = await api.put<ApiResponse<CommandResponseData>>(
      `/api/v1/commands/${id}`,
      data
    )
    return response.data
  }

  /**
   * 删除命令
   */
  static async deleteCommand(
    id: number
  ): Promise<ApiResponse<BatchDeleteCommandsResponseData>> {
    const response = await api.delete<ApiResponse<BatchDeleteCommandsResponseData>>(
      `/api/v1/commands/${id}`
    )
    return response.data
  }

  /**
   * 批量删除命令
   */
  static async batchDeleteCommands(
    ids: number[]
  ): Promise<ApiResponse<BatchDeleteCommandsResponseData>> {
    const response = await api.delete<ApiResponse<BatchDeleteCommandsResponseData>>(
      "/api/v1/commands/batch",
      { data: { ids } }
    )
    return response.data
  }
}
