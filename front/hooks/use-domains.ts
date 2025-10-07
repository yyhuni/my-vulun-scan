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

// 注意：后端没有通用的 GET /domains 接口，只有 GET /organizations/:id/domains
// 如果需要获取域名列表，请使用 useOrganizationDomains Hook
// 或者请后端添加 GET /domains 接口

// 为了向后兼容，提供一个别名函数，指向 useOrganizationDomains
// 这样如果有组件使用了 useDomains，可以更容易迁移
export function useDomains(params: { organizationId: string } & PaginationParams) {
  // 这里可以返回一个提示错误，指导用户使用正确的 Hook
  throw new Error(`
    useDomains 已被弃用。
    请使用 useOrganizationDomains(organizationId, params) 代替。
    
    示例：
    // 旧的用法
    useDomains({ organizationId: "1", page: 1, pageSize: 10 })
    
    // 新的用法
    useOrganizationDomains(1, { page: 1, pageSize: 10 })
  `)
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

// 解除组织与域名的关联
export function useRemoveDomainFromOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { organizationId: number; domainId: number }) => 
      DomainService.removeFromOrganization(data),
    onMutate: ({ organizationId, domainId }) => {
      toast.loading('正在解除关联...', { id: `remove-${organizationId}-${domainId}` })
    },
    onSuccess: (response, { organizationId, domainId }) => {
      toast.dismiss(`remove-${organizationId}-${domainId}`)
      
      if (response.state === 'success') {
        toast.success('解除关联成功')
        
        // 刷新相关查询
        queryClient.invalidateQueries({ queryKey: domainKeys.lists() })
        
        // 刷新组织的域名列表
        queryClient.invalidateQueries({ 
          queryKey: ['organizations', 'detail', organizationId, 'domains'] 
        })
      } else {
        throw new Error(response.message || '解除关联失败')
      }
    },
    onError: (error: any, { organizationId, domainId }) => {
      toast.dismiss(`remove-${organizationId}-${domainId}`)
      
      if (process.env.NODE_ENV === 'development') {
        console.error('解除关联失败:', error)
      }
      toast.error('解除关联失败')
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
