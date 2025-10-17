"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { EndpointService } from "@/services/endpoint.service"
import type { 
  Endpoint, 
  CreateEndpointRequest,
  UpdateEndpointRequest,
  GetEndpointsRequest,
  GetEndpointsResponse,
  BatchDeleteEndpointsRequest,
  BatchDeleteEndpointsResponse
} from "@/types/endpoint.types"

// Query Keys
export const endpointKeys = {
  all: ['endpoints'] as const,
  lists: () => [...endpointKeys.all, 'list'] as const,
  list: (params: GetEndpointsRequest) => 
    [...endpointKeys.lists(), params] as const,
  details: () => [...endpointKeys.all, 'detail'] as const,
  detail: (id: number) => [...endpointKeys.details(), id] as const,
  byDomain: (domainId: number, params: GetEndpointsRequest) => 
    [...endpointKeys.all, 'domain', domainId, params] as const,
  bySubdomain: (subdomainId: number, params: GetEndpointsRequest) => 
    [...endpointKeys.all, 'subdomain', subdomainId, params] as const,
}

// 获取单个 Endpoint 详情
export function useEndpoint(id: number) {
  return useQuery({
    queryKey: endpointKeys.detail(id),
    queryFn: () => EndpointService.getEndpointById(id),
    select: (response) => {
      if (response.state === 'success' && response.data) {
        return response.data as Endpoint
      }
      throw new Error(response.message || '获取端点详情失败')
    },
    enabled: !!id,
  })
}

// 获取 Endpoint 列表
export function useEndpoints(params?: GetEndpointsRequest) {
  const defaultParams: GetEndpointsRequest = {
    page: 1,
    pageSize: 10,
    ...params
  }
  
  return useQuery({
    queryKey: endpointKeys.list(defaultParams),
    queryFn: () => EndpointService.getEndpoints(defaultParams),
    select: (response) => {
      if (response.state === 'success' && response.data) {
        return response.data as GetEndpointsResponse
      }
      throw new Error(response.message || '获取端点列表失败')
    },
  })
}

// 根据域名ID获取 Endpoint 列表（使用专用路由）
export function useEndpointsByDomain(domainId: number, params?: Omit<GetEndpointsRequest, 'domainId'>) {
  const defaultParams: GetEndpointsRequest = {
    page: 1,
    pageSize: 10,
    ...params
  }
  
  return useQuery({
    queryKey: endpointKeys.byDomain(domainId, defaultParams),
    queryFn: () => EndpointService.getEndpointsByDomainId(domainId, defaultParams),
    select: (response) => {
      if (response.state === 'success' && response.data) {
        return response.data as GetEndpointsResponse
      }
      throw new Error(response.message || '获取域名端点列表失败')
    },
    enabled: !!domainId,
  })
}

// 根据子域名ID获取 Endpoint 列表（使用专用路由）
export function useEndpointsBySubdomain(subdomainId: number, params?: Omit<GetEndpointsRequest, 'subdomainId'>) {
  const defaultParams: GetEndpointsRequest = {
    page: 1,
    pageSize: 10,
    ...params
  }
  
  return useQuery({
    queryKey: endpointKeys.bySubdomain(subdomainId, defaultParams),
    queryFn: () => EndpointService.getEndpointsBySubdomainId(subdomainId, defaultParams),
    select: (response) => {
      if (response.state === 'success' && response.data) {
        return response.data as GetEndpointsResponse
      }
      throw new Error(response.message || '获取子域名端点列表失败')
    },
    enabled: !!subdomainId,
  })
}

// 创建 Endpoint（完全自动化）
export function useCreateEndpoint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      endpoints: Array<CreateEndpointRequest>
    }) => EndpointService.createEndpoints(data),
    onMutate: async () => {
      toast.loading('正在创建端点...', { id: 'create-endpoint' })
    },
    onSuccess: (response) => {
      // 关闭加载提示
      toast.dismiss('create-endpoint')
      
      if (response.state === 'success' && response.data) {
        const { newCreated, alreadyExisted } = response.data
        
        // 打印后端响应
        console.log('创建端点成功')
        console.log('后端响应:', response)
        
        // 前端自己构造成功提示消息
        if (alreadyExisted > 0) {
          toast.warning(
            `成功创建 ${newCreated} 个端点（${alreadyExisted} 个已存在）`
          )
        } else {
          toast.success(`成功创建 ${newCreated} 个端点`)
        }
        
        // 刷新所有端点相关查询（通配符匹配）
        queryClient.invalidateQueries({ queryKey: ['endpoints'] })
      } else {
        throw new Error('创建端点失败')
      }
    },
    onError: (error: any) => {
      // 关闭加载提示
      toast.dismiss('create-endpoint')
      
      console.error('创建端点失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('创建端点失败，请稍后重试')
    },
  })
}

// 删除单个 Endpoint
export function useDeleteEndpoint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => EndpointService.deleteEndpoint(id),
    onMutate: (id) => {
      toast.loading('正在删除端点...', { id: `delete-endpoint-${id}` })
    },
    onSuccess: (response, id) => {
      toast.dismiss(`delete-endpoint-${id}`)
      
      if (response.state === 'success') {
        // 打印后端响应
        console.log('删除端点成功')
        console.log('后端响应:', response)
        
        toast.success('删除成功')
        
        // 刷新所有端点相关查询（通配符匹配）
        queryClient.invalidateQueries({ queryKey: ['endpoints'] })
      } else {
        throw new Error(response.message || '删除端点失败')
      }
    },
    onError: (error: any, id) => {
      toast.dismiss(`delete-endpoint-${id}`)
      
      console.error('删除端点失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('删除端点失败，请稍后重试')
    },
  })
}

// 批量删除 Endpoint
export function useBatchDeleteEndpoints() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: BatchDeleteEndpointsRequest) => EndpointService.batchDeleteEndpoints(data),
    onMutate: () => {
      toast.loading('正在批量删除端点...', { id: 'batch-delete-endpoints' })
    },
    onSuccess: (response) => {
      toast.dismiss('batch-delete-endpoints')
      
      if (response.state === 'success' && response.data) {
        // 打印后端响应
        console.log('批量删除端点成功')
        console.log('后端响应:', response)
        
        const { deletedCount } = response.data
        toast.success(`成功删除 ${deletedCount} 个端点`)
        
        // 刷新所有端点相关查询（通配符匹配）
        queryClient.invalidateQueries({ queryKey: ['endpoints'] })
      } else {
        throw new Error(response.message || '批量删除端点失败')
      }
    },
    onError: (error: any) => {
      toast.dismiss('batch-delete-endpoints')
      
      console.error('批量删除端点失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('批量删除失败，请稍后重试')
    },
  })
}
