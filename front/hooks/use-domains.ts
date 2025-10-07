"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { DomainService } from "@/services/domain.service"
import type { Asset } from "@/types/asset.types"
import type { Domain, GetDomainsResponse } from "@/types/domain.types"
import type { PaginationParams } from "@/types/common.types"

// Query Keys
export const domainKeys = {
  all: ['domains'] as const,
  lists: () => [...domainKeys.all, 'list'] as const,
  list: (params: PaginationParams & { organizationId?: string }) => 
    [...domainKeys.lists(), params] as const,
  details: () => [...domainKeys.all, 'detail'] as const,
  detail: (id: number) => [...domainKeys.details(), id] as const,
}

// 获取域名列表
export function useDomains(params: PaginationParams & { organizationId?: string }) {
  return useQuery({
    queryKey: domainKeys.list(params),
    queryFn: () => DomainService.getDomains({
      ...params,
      organizationId: params.organizationId ? parseInt(params.organizationId) : undefined
    }),
    select: (response) => {
      if (response.state === 'success' && response.data) {
        return response.data as GetDomainsResponse
      }
      throw new Error(response.message || '获取域名列表失败')
    },
  })
}

// 获取单个域名详情
export function useDomain(id: number) {
  return useQuery({
    queryKey: domainKeys.detail(id),
    queryFn: () => DomainService.getDomains({ id }),
    select: (response) => {
      if (response.state === 'success' && response.data) {
        return response.data as Domain
      }
      throw new Error(response.message || '获取域名详情失败')
    },
    enabled: !!id,
  })
}

// 创建域名
export function useCreateDomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      domains: Array<{
        name: string
        description?: string
      }>
      organizationId: number
    }) => DomainService.createDomains(data),
    onMutate: async () => {
      toast.loading('正在创建域名...', { id: 'create-domain' })
    },
    onSuccess: (response, variables) => {
      // 关闭加载提示
      toast.dismiss('create-domain')
      
      if (response.state === 'success') {
        toast.success('创建成功')
        
        // 刷新相关查询
        queryClient.invalidateQueries({ queryKey: domainKeys.lists() })
        
        // 如果有组织ID，也刷新该组织的域名列表
        if (variables.organizationId) {
          queryClient.invalidateQueries({ 
            queryKey: domainKeys.list({ organizationId: variables.organizationId.toString() }) 
          })
        }
      } else {
        throw new Error(response.message || '创建域名失败')
      }
    },
    onError: (error: any) => {
      // 关闭加载提示
      toast.dismiss('create-domain')
      
      if (process.env.NODE_ENV === 'development') {
        console.error('创建域名失败:', error)
      }
      toast.error('创建失败')
    },
  })
}

// 注意：域名的更新和删除功能需要后端 API 支持
// 当后端实现相应接口后，可以取消注释以下代码：

/*
// 更新域名
export function useUpdateDomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; description?: string } }) =>
      DomainService.updateDomain({ id, ...data }),
    onMutate: ({ id }) => {
      toast.loading('正在更新域名...', { id: `update-domain-${id}` })
    },
    onSuccess: (response: any, { id }) => {
      toast.dismiss(`update-domain-${id}`)
      
      if (response.state === 'success') {
        toast.success('更新成功')
        queryClient.invalidateQueries({ queryKey: domainKeys.lists() })
        queryClient.invalidateQueries({ queryKey: domainKeys.detail(id) })
      } else {
        throw new Error(response.message || '更新域名失败')
      }
    },
    onError: (error: any, { id }) => {
      toast.dismiss(`update-domain-${id}`)
      if (process.env.NODE_ENV === 'development') {
        console.error('更新域名失败:', error)
      }
      toast.error('更新失败')
    },
  })
}

// 删除域名
export function useDeleteDomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => DomainService.deleteDomain(id),
    onMutate: (id) => {
      toast.loading('正在删除域名...', { id: `delete-domain-${id}` })
    },
    onSuccess: (response: any, id) => {
      toast.dismiss(`delete-domain-${id}`)
      
      if (response.state === 'success') {
        toast.success('删除成功')
        queryClient.invalidateQueries({ queryKey: domainKeys.lists() })
      } else {
        throw new Error(response.message || '删除域名失败')
      }
    },
    onError: (error: any, id) => {
      toast.dismiss(`delete-domain-${id}`)
      if (process.env.NODE_ENV === 'development') {
        console.error('删除域名失败:', error)
      }
      toast.error('删除失败')
    },
  })
}

// 批量删除域名
export function useBatchDeleteDomains() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: number[]) => DomainService.batchDeleteDomains(ids),
    onMutate: () => {
      toast.loading('正在批量删除域名...', { id: 'batch-delete-domains' })
    },
    onSuccess: (response: any) => {
      toast.dismiss('batch-delete-domains')
      
      if (response.state === 'success') {
        toast.success('批量删除成功')
        queryClient.invalidateQueries({ queryKey: domainKeys.lists() })
      } else {
        throw new Error(response.message || '批量删除域名失败')
      }
    },
    onError: (error: any) => {
      toast.dismiss('batch-delete-domains')
      if (process.env.NODE_ENV === 'development') {
        console.error('批量删除域名失败:', error)
      }
      toast.error('批量删除失败')
    },
  })
}
*/
