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

// 获取单个域名详情
export function useDomain(id: number) {
  return useQuery({
    queryKey: domainKeys.detail(id),
    queryFn: () => DomainService.getDomainById(id),
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
        
        // 刷新该组织的域名列表（使用 organizationKeys）
        if (variables.organizationId) {
          queryClient.invalidateQueries({ 
            queryKey: ['organizations', 'detail', variables.organizationId, 'domains']
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
      
      const errorMessage = error?.response?.data?.message || error?.message || '创建失败'
      toast.error(errorMessage)
    },
  })
}

// 从组织中移除域名
export function useDeleteDomainFromOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { organizationId: number; domainId: number }) => 
      DomainService.deleteDomainFromOrganization(data),
    onMutate: ({ organizationId, domainId }) => {
      toast.loading('正在移除域名...', { id: `delete-${organizationId}-${domainId}` })
    },
    onSuccess: (response, { organizationId, domainId }) => {
      toast.dismiss(`delete-${organizationId}-${domainId}`)
      
      if (response.state === 'success') {
        // 使用后端返回的详细消息，如果没有则使用默认消息
        const successMessage = response.data?.message || `成功从组织 ID: ${organizationId} 移除域名 ID: ${domainId}`
        toast.success(successMessage)
        
        // 刷新相关查询
        queryClient.invalidateQueries({ queryKey: domainKeys.lists() })
        
        // 刷新组织的域名列表
        queryClient.invalidateQueries({ 
          queryKey: ['organizations', 'detail', organizationId, 'domains'] 
        })
      } else {
        throw new Error(response.message || '移除失败')
      }
    },
    onError: (error: any, { organizationId, domainId }) => {
      toast.dismiss(`delete-${organizationId}-${domainId}`)
      
      if (process.env.NODE_ENV === 'development') {
        console.error('移除域名失败:', error)
      }
      
      const errorMessage = error?.response?.data?.message || error?.message || '移除失败'
      toast.error(errorMessage)
    },
  })
}

// 批量从组织中移除域名
export function useBatchDeleteDomainsFromOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { organizationId: number; domainIds: number[] }) => 
      DomainService.batchDeleteDomainsFromOrganization(data),
    onMutate: ({ organizationId }) => {
      toast.loading('正在批量移除域名...', { id: `batch-delete-${organizationId}` })
    },
    onSuccess: (response, { organizationId }) => {
      toast.dismiss(`batch-delete-${organizationId}`)
      
      if (response.state === 'success') {
        // 使用后端返回的详细消息
        const message = response.data?.message || '批量移除完成'
        const successCount = response.data?.successCount || 0
        const failedCount = response.data?.failedCount || 0
        
        if (failedCount > 0) {
          toast.warning(`${message}（成功：${successCount}，失败：${failedCount}）`)
        } else {
          toast.success(message)
        }
        
        // 刷新相关查询
        queryClient.invalidateQueries({ queryKey: domainKeys.lists() })
        
        // 刷新组织的域名列表
        queryClient.invalidateQueries({ 
          queryKey: ['organizations', 'detail', organizationId, 'domains'] 
        })
      } else {
        throw new Error(response.message || '批量移除失败')
      }
    },
    onError: (error: any, { organizationId }) => {
      toast.dismiss(`batch-delete-${organizationId}`)
      
      if (process.env.NODE_ENV === 'development') {
        console.error('批量移除域名失败:', error)
      }
      
      const errorMessage = error?.response?.data?.message || error?.message || '批量移除失败'
      toast.error(errorMessage)
    },
  })
}

// 更新域名
export function useUpdateDomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string } }) =>
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
        
        // 刷新所有组织的域名列表（更精确的匹配）
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey as string[]
            return key[0] === 'organizations' && key[2] === 'domains'
          }
        })
      } else {
        throw new Error(response.message || '更新域名失败')
      }
    },
    onError: (error: any, { id }) => {
      toast.dismiss(`update-domain-${id}`)
      if (process.env.NODE_ENV === 'development') {
        console.error('更新域名失败:', error)
      }
      
      const errorMessage = error?.response?.data?.message || error?.message || '更新失败'
      toast.error(errorMessage)
    },
  })
}
