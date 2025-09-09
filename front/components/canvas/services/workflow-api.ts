// 工作流 API 服务
// 处理工作流的保存、加载、删除等操作

import { api, getErrorMessage } from '@/lib/api-client'
import type {
  SecurityNode,
  SecurityEdge,
  WorkflowApiResponse,
  WorkflowListItem,
  WorkflowSearchParams
} from '../workflow/lib/workflow.types'

// 创建工作流请求数据类型
export interface CreateWorkflowRequest {
  name: string
  description: string
  category: string
  created_at: string
  updated_at: string
  variables: Array<{
    name: string
    value: string
    type: 'file_path' | 'number' | 'string'
  }>
  workflow_data: {
    nodes: SecurityNode[]
    edges: SecurityEdge[]
  }
}

// 创建工作流响应数据类型
export interface CreateWorkflowResponse {
  id: string
  name: string
  description: string
  category: string
  status: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

// 获取工作流响应数据类型
export interface GetWorkflowResponse {
  id: string
  name: string
  description: string
  category: string
  status: string
  createdAt: string
  updatedAt: string
  createdBy: string
  variables: Array<{
    name: string
    value: string
    type: 'file_path' | 'number' | 'string'
  }>
  workflowData: {
    nodes: SecurityNode[]
    edges: SecurityEdge[]
  }
}

export class WorkflowAPIService {
  private baseUrl = '/workflow/workflows'

  // 获取工作流列表
  async getWorkflows(params?: WorkflowSearchParams): Promise<WorkflowListItem[]> {
    try {
      console.log('=== 获取工作流列表 ===')
      console.log('请求参数:', params)
      console.log('请求URL:', `${this.baseUrl}`)

      const response = await api.get<{
        code: string
        message: string
        data: {
          workflows: WorkflowListItem[]
          total: number
        }
      }>(`${this.baseUrl}`, { params })

      console.log('=== 工作流列表响应 ===')
      console.log('响应数据:', response.data)

      // 检查后端响应格式
      if (response.data.code === 'SUCCESS') {
        return response.data.data.workflows || []
      } else {
        throw new Error(response.data.message || '获取工作流列表失败')
      }
    } catch (error: any) {
      console.error('获取工作流列表API调用失败:', error)
      const errorMessage = getErrorMessage(error)
      throw new Error(`获取工作流列表失败: ${errorMessage}`)
    }
  }

  // 获取工作流详情
  async getWorkflow(id: string): Promise<GetWorkflowResponse> {
    try {
      console.log('=== 获取工作流详情 ===')
      console.log('工作流ID:', id)
      console.log('请求URL:', `${this.baseUrl}/${id}`)

      const response = await api.get<{
        code: string
        message: string
        data: GetWorkflowResponse
      }>(`${this.baseUrl}/${id}`)

      console.log('=== 获取工作流响应 ===')
      console.log('响应数据:', response.data)

      // 检查后端响应格式
      if (response.data.code === 'SUCCESS') {
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取工作流失败')
      }
    } catch (error: any) {
      console.error('获取工作流API调用失败:', error)
      const errorMessage = getErrorMessage(error)
      throw new Error(`获取工作流失败: ${errorMessage}`)
    }
  }

  // 创建工作流
  async createWorkflow(data: CreateWorkflowRequest): Promise<CreateWorkflowResponse> {
    try {
      console.log('=== 发送创建工作流请求 ===')
      console.log('请求URL:', `${this.baseUrl}/create`)
      console.log('请求数据:', data)

      const response = await api.post<{
        code: string
        message: string
        data: CreateWorkflowResponse
      }>(`${this.baseUrl}/create`, data)

      console.log('=== 创建工作流响应 ===')
      console.log('响应数据:', response.data)

      // 检查后端响应格式
      if (response.data.code === 'SUCCESS') {
        return response.data.data
      } else {
        throw new Error(response.data.message || '创建工作流失败')
      }
    } catch (error: any) {
      console.error('创建工作流API调用失败:', error)
      const errorMessage = getErrorMessage(error)
      throw new Error(`创建工作流失败: ${errorMessage}`)
    }
  }

  // 保存工作流（兼容旧接口）
  async saveWorkflow(data: {
    id?: string
    name: string
    description?: string
    nodes: SecurityNode[]
    edges: SecurityEdge[]
  }): Promise<WorkflowApiResponse<{ id: string }>> {
    // 提取工作流变量（从开始节点中获取）
    const startNode = data.nodes.find(node => node.type === 'workflow-start');
    const variables = (startNode?.data as any)?.variables || [];

    // 转换为新的创建工作流格式
    const now = new Date().toISOString();
    const createData: CreateWorkflowRequest = {
      name: data.name,
      description: data.description || '',
      category: '网络扫描', // 默认分类
      created_at: now,
      updated_at: now,
      variables: variables,
      workflow_data: {
        nodes: data.nodes,
        edges: data.edges
      }
    }

    try {
      const result = await this.createWorkflow(createData)
      return {
        success: true,
        data: { id: result.id }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: error instanceof Error ? error.message : '保存失败',
          details: error
        }
      }
    }
  }

  // 删除工作流
  async deleteWorkflow(id: string): Promise<WorkflowApiResponse<void>> {
    try {
      console.log('=== 删除工作流请求 ===')
      console.log('工作流ID:', id)
      console.log('请求URL:', `${this.baseUrl}/delete`)

      const response = await api.post<{
        code: string
        message: string
      }>(`${this.baseUrl}/delete`, {
        workflow_id: id
      })

      console.log('=== 删除工作流响应 ===')
      console.log('响应数据:', response.data)

      if (response.data.code === 'SUCCESS') {
        return { success: true }
      } else {
        throw new Error(response.data.message || '删除工作流失败')
      }
    } catch (error: any) {
      console.error('删除工作流API调用失败:', error)
      const errorMessage = getErrorMessage(error)
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: `删除工作流失败: ${errorMessage}`,
          details: error
        }
      }
    }
  }

  // 复制工作流
  async duplicateWorkflow(id: string, name: string): Promise<WorkflowApiResponse<{ id: string }>> {
    try {
      console.log('=== 复制工作流请求 ===')
      console.log('原工作流ID:', id)
      console.log('新工作流名称:', name)
      console.log('请求URL:', `${this.baseUrl}/duplicate`)

      const response = await api.post<{
        code: string
        message: string
        data: { id: string }
      }>(`${this.baseUrl}/duplicate`, {
        workflow_id: id,
        name: name
      })

      console.log('=== 复制工作流响应 ===')
      console.log('响应数据:', response.data)

      if (response.data.code === 'SUCCESS') {
        return {
          success: true,
          data: { id: response.data.data.id }
        }
      } else {
        throw new Error(response.data.message || '复制工作流失败')
      }
    } catch (error: any) {
      console.error('复制工作流API调用失败:', error)
      const errorMessage = getErrorMessage(error)
      return {
        success: false,
        error: {
          code: 'DUPLICATE_FAILED',
          message: `复制工作流失败: ${errorMessage}`,
          details: error
        }
      }
    }
  }
}

// 导出单例实例
export const workflowAPI = new WorkflowAPIService() 