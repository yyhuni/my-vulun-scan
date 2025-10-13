"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { EndpointService } from "@/services/endpoint.service"
import type { 
  Endpoint, 
  CreateEndpointRequest,
  UpdateEndpointRequest,
  GetEndpointsRequest,
  GetEndpointsResponse 
} from "@/types/endpoint.types"

// Query Keys
export const endpointKeys = {
  all: ['endpoints'] as const,
  lists: () => [...endpointKeys.all, 'list'] as const,
  list: (params: GetEndpointsRequest) => 
    [...endpointKeys.lists(), params] as const,
  details: () => [...endpointKeys.all, 'detail'] as const,
  detail: (id: number) => [...endpointKeys.details(), id] as const,
  byDomain: (domainId: number) => [...endpointKeys.all, 'domain', domainId] as const,
  bySubdomain: (subdomainId: number) => [...endpointKeys.all, 'subdomain', subdomainId] as const,
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
    sortBy: 'updated_at',
    sortOrder: 'desc',
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

// 根据域名ID获取 Endpoint 列表
export function useEndpointsByDomain(domainId: number, params?: Omit<GetEndpointsRequest, 'domainId'>) {
  const defaultParams: GetEndpointsRequest = {
    page: 1,
    pageSize: 10,
    sortBy: 'updated_at',
    sortOrder: 'desc',
    ...params
  }
  
  return useQuery({
    queryKey: endpointKeys.byDomain(domainId),
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

// 根据子域名ID获取 Endpoint 列表
export function useEndpointsBySubdomain(subdomainId: number, params?: Omit<GetEndpointsRequest, 'subdomainId'>) {
  const defaultParams: GetEndpointsRequest = {
    page: 1,
    pageSize: 10,
    sortBy: 'updated_at',
    sortOrder: 'desc',
    ...params
  }
  
  return useQuery({
    queryKey: endpointKeys.bySubdomain(subdomainId),
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
        toast.success('创建成功')
        
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

// 解除组织与 Endpoint 的关联
export function useRemoveEndpointFromOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { organizationId: number; endpointId: number }) => 
      EndpointService.removeFromOrganization(data),
    onMutate: ({ organizationId, endpointId }) => {
      toast.loading('正在解除关联...', { id: `remove-${organizationId}-${endpointId}` })
    },
    onSuccess: (response, { organizationId, endpointId }) => {
      toast.dismiss(`remove-${organizationId}-${endpointId}`)
      
      if (response.state === 'success') {
        toast.success('解除关联成功')
        
        // 刷新相关查询
        queryClient.invalidateQueries({ queryKey: endpointKeys.lists() })
        
        // 刷新组织的端点列表
        queryClient.invalidateQueries({ 
          queryKey: ['organizations', 'detail', organizationId, 'endpoints'] 
        })
      } else {
        throw new Error(response.message || '解除关联失败')
      }
    },
    onError: (error: any, { organizationId, endpointId }) => {
      toast.dismiss(`remove-${organizationId}-${endpointId}`)
      
      if (process.env.NODE_ENV === 'development') {
        console.error('解除关联失败:', error)
      }
      
      const errorMessage = error?.response?.data?.message || error?.message || '解除关联失败'
      toast.error(errorMessage)
    },
  })
}

// 更新 Endpoint
export function useUpdateEndpoint() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateEndpointRequest) => EndpointService.updateEndpoint(data),
    onMutate: ({ id }) => {
      toast.loading('正在更新端点...', { id: `update-endpoint-${id}` })
    },
    onSuccess: (response: any, { id }) => {
      toast.dismiss(`update-endpoint-${id}`)
      
      if (response.state === 'success') {
        toast.success('更新成功')
        queryClient.invalidateQueries({ queryKey: endpointKeys.lists() })
        queryClient.invalidateQueries({ queryKey: endpointKeys.detail(id) })
        
        // 刷新所有组织的端点列表
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey as string[]
            return key[0] === 'organizations' && key[2] === 'endpoints'
          }
        })
      } else {
        throw new Error(response.message || '更新端点失败')
      }
    },
    onError: (error: any, { id }) => {
      toast.dismiss(`update-endpoint-${id}`)
      if (process.env.NODE_ENV === 'development') {
        console.error('更新端点失败:', error)
      }
      
      const errorMessage = error?.response?.data?.message || error?.message || '更新失败'
      toast.error(errorMessage)
    },
  })
}
