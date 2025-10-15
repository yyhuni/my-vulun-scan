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
      
      if (response.state === 'success') {
        const msg = (response as any)?.data?.message || response.message || '创建成功'
        toast.success(msg)
        
        // 刷新所有相关查询（因为可能自动创建了 domain 和 subdomain）
        queryClient.invalidateQueries({ queryKey: endpointKeys.lists() })
        
        // 刷新所有域名的端点列表
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey as string[]
            return key[0] === 'endpoints' && (key[1] === 'domain' || key[1] === 'subdomain')
          }
        })
      } else {
        throw new Error(response.message || '创建端点失败')
      }
    },
    onError: (error: any) => {
      // 关闭加载提示
      toast.dismiss('create-endpoint')
      
      if (process.env.NODE_ENV === 'development') {
        console.error('创建端点失败:', error)
      }
      
      const errorMessage = error?.response?.data?.message || error?.message || '创建失败'
      toast.error(errorMessage)
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
        const data = response.data as BatchDeleteEndpointsResponse
        toast.success(data.message || '删除成功')
        
        // 刷新相关查询
        queryClient.invalidateQueries({ queryKey: endpointKeys.lists() })
        queryClient.invalidateQueries({ queryKey: endpointKeys.detail(id) })
        
        // 刷新所有域名和子域名的端点列表
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey as string[]
            return key[0] === 'endpoints' && (key[1] === 'domain' || key[1] === 'subdomain')
          }
        })
      } else {
        throw new Error(response.message || '删除端点失败')
      }
    },
    onError: (error: any, id) => {
      toast.dismiss(`delete-endpoint-${id}`)
      
      if (process.env.NODE_ENV === 'development') {
        console.error('删除端点失败:', error)
      }
      
      const errorMessage = error?.response?.data?.message || error?.message || '删除失败'
      toast.error(errorMessage)
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
      
      if (response.state === 'success') {
        const data = response.data as BatchDeleteEndpointsResponse
        toast.success(data.message || `已删除 ${data.deletedCount} 个端点`)
        
        // 刷新相关查询
        queryClient.invalidateQueries({ queryKey: endpointKeys.lists() })
        
        // 刷新所有域名和子域名的端点列表
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey as string[]
            return key[0] === 'endpoints' && (key[1] === 'domain' || key[1] === 'subdomain')
          }
        })
      } else {
        throw new Error(response.message || '批量删除端点失败')
      }
    },
    onError: (error: any) => {
      toast.dismiss('batch-delete-endpoints')
      
      if (process.env.NODE_ENV === 'development') {
        console.error('批量删除端点失败:', error)
      }
      
      const errorMessage = error?.response?.data?.message || error?.message || '批量删除失败'
      toast.error(errorMessage)
    },
  })
}
