import { api } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api-response.types"
import type { Tool, ToolsResponse, CreateToolRequest, GetToolsParams, CategoriesResponse } from "@/types/tool.types"

export class ToolService {
  /**
   * 获取所有工具分类
   * @returns Promise<ApiResponse<CategoriesResponse>>
   */
  static async getCategories(): Promise<ApiResponse<CategoriesResponse>> {
    const response = await api.get<ApiResponse<CategoriesResponse>>('/categories')
    return response.data
  }
  /**
   * 获取工具列表
   * @param params - 查询参数对象
   * @param params.page - 当前页码，1-based
   * @param params.pageSize - 分页大小
   * @returns Promise<ApiResponse<ToolsResponse>>
   * @description 后端固定按更新时间降序排列，不支持自定义排序
   */
  static async getTools(params?: GetToolsParams): Promise<ApiResponse<ToolsResponse>> {
    const response = await api.get<ApiResponse<ToolsResponse>>(
      '/tools',
      { params }
    )
    return response.data
  }

  /**
   * 创建新工具
   * @param data - 工具信息对象
   * @param data.name - 工具名称
   * @param data.repoUrl - 仓库地址
   * @param data.version - 版本号
   * @param data.description - 工具描述
   * @returns Promise<ApiResponse<{ tool: Tool }>>
   */
  static async createTool(data: CreateToolRequest): Promise<ApiResponse<{ tool: Tool }>> {
    const response = await api.post<ApiResponse<{ tool: Tool }>>('/tools/create', data)
    return response.data
  }
}
