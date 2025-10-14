"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ToolService } from "@/services/tool.service"
import type { Tool, GetToolsParams, CreateToolRequest } from "@/types/tool.types"

// Query Keys
export const toolKeys = {
  all: ['tools'] as const,
  lists: () => [...toolKeys.all, 'list'] as const,
  list: (params: GetToolsParams) => [...toolKeys.lists(), params] as const,
  categories: ['categories'] as const,
}

// 获取工具分类列表（返回分类名称字符串数组）
export function useCategories() {
  return useQuery({
    queryKey: toolKeys.categories,
    queryFn: () => ToolService.getCategories(),
    select: (response) => {
      if (response.state === 'success' && response.data) {
        return response.data.categories || []
      }
      throw new Error(response.message || '获取分类列表失败')
    },
  })
}

// 获取工具列表
export function useTools(params: GetToolsParams = {}) {
  return useQuery({
    queryKey: toolKeys.list(params),
    queryFn: () => ToolService.getTools(params),
    select: (response) => {
      if (response.state === 'success' && response.data) {
        return {
          tools: response.data.tools || [],
          pagination: {
            total: response.data.total || 0,
            page: response.data.page || 1,
            pageSize: response.data.pageSize || 10,
            totalPages: response.data.totalPages || 0,
          }
        }
      }
      throw new Error(response.message || '获取工具列表失败')
    },
  })
}

// 创建工具
export function useCreateTool() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateToolRequest) => ToolService.createTool(data),
    onMutate: async () => {
      toast.loading('正在创建工具...', { id: 'create-tool' })
    },
    onSuccess: (response) => {
      toast.dismiss('create-tool')
      
      if (response.state === 'success') {
        toast.success('创建成功')
        
        // 刷新工具列表和分类列表
        queryClient.invalidateQueries({ 
          queryKey: toolKeys.all,
          refetchType: 'active' 
        })
      } else {
        throw new Error(response.message || '创建工具失败')
      }
    },
    onError: (error: any) => {
      toast.dismiss('create-tool')
      
      if (process.env.NODE_ENV === 'development') {
        console.error('创建工具失败:', error)
      }
      
      const errorMessage = error?.response?.data?.message || error?.message || '创建失败'
      toast.error(errorMessage)
    },
  })
}
