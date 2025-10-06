"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { SubDomainService } from "@/services/subdomain.service"
import type { SubDomain, GetSubDomainsResponse, GetSubDomainsParams } from "@/types/subdomain.types"
import type { PaginationParams } from "@/types/common.types"

// Query Keys
export const subdomainKeys = {
  all: ['subdomains'] as const,
  lists: () => [...subdomainKeys.all, 'list'] as const,
  list: (params: PaginationParams & { organizationId?: string }) => 
    [...subdomainKeys.lists(), params] as const,
  details: () => [...subdomainKeys.all, 'detail'] as const,
  detail: (id: number) => [...subdomainKeys.details(), id] as const,
}

// 获取子域名列表
export function useSubdomains(params: PaginationParams & { organizationId?: string }) {
  return useQuery({
    queryKey: subdomainKeys.list(params),
    queryFn: () => SubDomainService.getSubDomains({
      ...params,
      organizationId: params.organizationId ? parseInt(params.organizationId) : undefined,
      sortBy: params.sortBy as "id" | "name" | "createdAt" | "updatedAt" | undefined
    }),
    select: (response) => {
      if (response.state === 'success' && response.data) {
        return response.data as GetSubDomainsResponse
      }
      throw new Error(response.message || '获取子域名列表失败')
    },
  })
}

// 获取单个子域名详情
export function useSubdomain(id: number) {
  return useQuery({
    queryKey: subdomainKeys.detail(id),
    queryFn: () => SubDomainService.getSubDomains({ id }),
    select: (response) => {
      if (response.state === 'success' && response.data) {
        return response.data as SubDomain
      }
      throw new Error(response.message || '获取子域名详情失败')
    },
    enabled: !!id,
  })
}

// 创建子域名
export function useCreateSubdomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      subDomains: string[]
      domainId: number
    }) => SubDomainService.createSubDomains(data),
    onMutate: async () => {
      toast.loading('正在创建子域名...', { id: 'create-subdomain' })
    },
    onSuccess: (response) => {
      if (response.state === 'success') {
        toast.success('子域名创建成功', { id: 'create-subdomain' })
        
        // 刷新相关查询
        queryClient.invalidateQueries({ queryKey: subdomainKeys.lists() })
      } else {
        throw new Error(response.message || '创建子域名失败')
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || '创建子域名失败'
      toast.error(errorMessage, { id: 'create-subdomain' })
    },
  })
}

// 注意：子域名服务目前只支持创建和查询，更新和删除功能尚未实现
// 如果需要这些功能，请先在后端实现相应的 API 接口
