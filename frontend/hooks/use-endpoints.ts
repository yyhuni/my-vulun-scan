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
      // RESTful 标准：直接返回数据
      return response as Endpoint
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
      // RESTful 标准：直接返回数据
      return response as GetEndpointsResponse
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
      // RESTful 标准：直接返回数据
      return response as GetEndpointsResponse
    },
    enabled: !!domainId,
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
      
      // 打印后端响应
      console.log('删除端点成功')
      
      toast.success('删除成功')
      
      // 刷新所有端点相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
    },
    onError: (error: any, id) => {
      toast.dismiss(`delete-endpoint-${id}`)
      
      console.error('删除端点失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('删除端点失败，请查看控制台日志')
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
      
      // 打印后端响应
      console.log('批量删除端点成功')
      console.log('后端响应:', response)
      
      const { deletedCount } = response
      toast.success(`成功删除 ${deletedCount} 个端点`)
      
      // 刷新所有端点相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['endpoints'] })
    },
    onError: (error: any) => {
      toast.dismiss('batch-delete-endpoints')
      
      console.error('批量删除端点失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('批量删除失败，请查看控制台日志')
    },
  })
}
