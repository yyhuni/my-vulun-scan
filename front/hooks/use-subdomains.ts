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
  list: (params: PaginationParams & { organizationId?: string; domainId?: string }) => 
    [...subdomainKeys.lists(), params] as const,
  details: () => [...subdomainKeys.all, 'detail'] as const,
  detail: (id: number) => [...subdomainKeys.details(), id] as const,
}

// 获取子域名列表（根据参数自动选择API端点）
export function useSubdomains(params: PaginationParams & { organizationId?: string; domainId?: string }) {
  return useQuery({
    queryKey: subdomainKeys.list(params),
    queryFn: async () => {
      // 根据参数选择不同的API端点
      if (params.organizationId) {
        // 获取组织的子域名
        return SubDomainService.getSubDomainsByOrganization(
          parseInt(params.organizationId),
          {
            page: params.page,
            pageSize: params.pageSize,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder
          }
        )
      } else if (params.domainId) {
        // 获取域名的子域名
        return SubDomainService.getSubDomainsByDomain(
          parseInt(params.domainId),
          {
            page: params.page,
            pageSize: params.pageSize,
            sortBy: params.sortBy,
            sortOrder: params.sortOrder
          }
        )
      } else {
        // 获取所有子域名
        return SubDomainService.getSubDomains({
          page: params.page,
          pageSize: params.pageSize,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder
        })
      }
    },
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
    queryFn: () => SubDomainService.getSubDomainById(id),
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
      // 关闭加载提示
      toast.dismiss('create-subdomain')
      
      if (response.state === 'success') {
        toast.success('创建成功')
        
        // 刷新相关查询
        queryClient.invalidateQueries({ queryKey: subdomainKeys.lists() })
      } else {
        throw new Error(response.message || '创建子域名失败')
      }
    },
    onError: (error: any) => {
      // 关闭加载提示
      toast.dismiss('create-subdomain')
      
      if (process.env.NODE_ENV === 'development') {
        console.error('创建子域名失败:', error)
      }
      toast.error('创建失败')
    },
  })
}

// 注意：子域名的更新和删除功能需要后端 API 支持
// 当后端实现相应接口后，可以取消注释以下代码：

/*
// 更新子域名
export function useUpdateSubdomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; description?: string } }) =>
      SubDomainService.updateSubDomain({ id, ...data }),
    onMutate: ({ id }) => {
      toast.loading('正在更新子域名...', { id: `update-subdomain-${id}` })
    },
    onSuccess: (response: any, { id }) => {
      toast.dismiss(`update-subdomain-${id}`)
      
      if (response.state === 'success') {
        toast.success('更新成功')
        queryClient.invalidateQueries({ queryKey: subdomainKeys.lists() })
        queryClient.invalidateQueries({ queryKey: subdomainKeys.detail(id) })
      } else {
        throw new Error(response.message || '更新子域名失败')
      }
    },
    onError: (error: any, { id }) => {
      toast.dismiss(`update-subdomain-${id}`)
      if (process.env.NODE_ENV === 'development') {
        console.error('更新子域名失败:', error)
      }
      toast.error('更新失败')
    },
  })
}

// 删除子域名
export function useDeleteSubdomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => SubDomainService.deleteSubDomain(id),
    onMutate: (id) => {
      toast.loading('正在删除子域名...', { id: `delete-subdomain-${id}` })
    },
    onSuccess: (response: any, id) => {
      toast.dismiss(`delete-subdomain-${id}`)
      
      if (response.state === 'success') {
        toast.success('删除成功')
        queryClient.invalidateQueries({ queryKey: subdomainKeys.lists() })
      } else {
        throw new Error(response.message || '删除子域名失败')
      }
    },
    onError: (error: any, id) => {
      toast.dismiss(`delete-subdomain-${id}`)
      if (process.env.NODE_ENV === 'development') {
        console.error('删除子域名失败:', error)
      }
      toast.error('删除失败')
    },
  })
}

// 批量删除子域名
export function useBatchDeleteSubdomains() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: number[]) => SubDomainService.batchDeleteSubDomains(ids),
    onMutate: () => {
      toast.loading('正在批量删除子域名...', { id: 'batch-delete-subdomains' })
    },
    onSuccess: (response: any) => {
      toast.dismiss('batch-delete-subdomains')
      
      if (response.state === 'success') {
        toast.success('批量删除成功')
        queryClient.invalidateQueries({ queryKey: subdomainKeys.lists() })
      } else {
        throw new Error(response.message || '批量删除子域名失败')
      }
    },
    onError: (error: any) => {
      toast.dismiss('batch-delete-subdomains')
      if (process.env.NODE_ENV === 'development') {
        console.error('批量删除子域名失败:', error)
      }
      toast.error('批量删除失败')
    },
  })
}
*/
