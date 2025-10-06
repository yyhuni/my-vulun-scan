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
      if (response.state === 'success') {
        toast.success('域名创建成功', { id: 'create-domain' })
        
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
      const errorMessage = error.message || '创建域名失败'
      toast.error(errorMessage, { id: 'create-domain' })
    },
  })
}

// 注意：域名服务目前只支持创建和查询，更新和删除功能尚未实现
// 如果需要这些功能，请先在后端实现相应的 API 接口
