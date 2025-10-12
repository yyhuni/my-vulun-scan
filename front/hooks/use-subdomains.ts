"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"
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
      // 抛出包含后端错误信息的错误
      const errorMessage = response.message || '获取子域名列表失败'
      throw new Error(errorMessage)
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
      // 抛出包含后端错误信息的错误
      const errorMessage = response.message || '获取子域名详情失败'
      throw new Error(errorMessage)
    },
    enabled: !!id,
  })
}

// 创建子域名
export function useCreateSubdomain() {
  const queryClient = useQueryClient()
  const params = useParams()
  
  // 从路由参数中自动获取组织ID
  const routeOrganizationId = params.id ? parseInt(params.id as string) : undefined

  return useMutation({
    mutationFn: (data: {
      organizationId?: number  // 变为可选，优先使用传入的，否则使用路由中的
      domainGroups: Array<{
        rootDomain: string
        subdomains: string[]
      }>
    }) => {
      // 优先使用传入的 organizationId，否则使用路由中的
      const finalOrgId = data.organizationId || routeOrganizationId
      
      if (!finalOrgId) {
        throw new Error('缺少组织ID：请确保在组织页面中调用此方法，或手动传递 organizationId')
      }

      return SubDomainService.createSubDomains({
        organizationId: finalOrgId,
        domainGroups: data.domainGroups
      })
    },
    onMutate: async () => {
      toast.loading('正在创建子域名...', { id: 'create-subdomain' })
    },
    onSuccess: (response) => {
      // 关闭加载提示
      toast.dismiss('create-subdomain')
      
      if (response.state === 'success' && response.data) {
        const { subdomainsCreated, alreadyExists, skippedDomains } = response.data
        
        // 根据不同情况构建友好的消息
        if (subdomainsCreated > 0) {
          // 成功创建了一些子域名
          let message = `✅ 成功创建 ${subdomainsCreated} 个子域名`
          
          const details: string[] = []
          if (alreadyExists > 0) {
            details.push(`${alreadyExists} 个已存在`)
          }
          if (skippedDomains && skippedDomains.length > 0) {
            details.push(`${skippedDomains.length} 个根域名无效`)
          }
          
          if (details.length > 0) {
            message += `\n⚠️ ${details.join('，')}`
          }
          
          toast.success(message, { duration: 4000 })
        } else if (skippedDomains && skippedDomains.length > 0) {
          // 所有根域名都无效
          toast.error(
            `❌ 创建失败：所有根域名都无效\n${skippedDomains.join(', ')}\n请先在系统中添加并关联根域名`,
            { duration: 5000 }
          )
        } else if (alreadyExists > 0) {
          // 所有子域名都已存在
          toast.info(`📝 所有 ${alreadyExists} 个子域名已存在`, { duration: 3000 })
        } else {
          // 兜底情况
          toast.success('操作成功')
        }
        
        // 刷新相关查询
        queryClient.invalidateQueries({ queryKey: subdomainKeys.lists() })
      } else {
        // 后端返回了错误状态，直接显示后端的 message
        toast.error(response.message || '创建子域名失败')
      }
    },
    onError: (error: any) => {
      // 关闭加载提示
      toast.dismiss('create-subdomain')
      
      if (process.env.NODE_ENV === 'development') {
        console.error('创建子域名失败:', error)
      }
      
      // 显示具体的错误信息
      const errorMessage = error?.response?.data?.message || error?.message || '创建失败'
      toast.error(errorMessage)
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
    onSuccess: (response, id) => {
      toast.dismiss(`delete-subdomain-${id}`)
      
      if (response.state === 'success') {
        toast.success('✅ 删除成功')
        queryClient.invalidateQueries({ queryKey: subdomainKeys.lists() })
      } else {
        toast.error(response.message || '删除子域名失败')
      }
    },
    onError: (error: any, id) => {
      toast.dismiss(`delete-subdomain-${id}`)
      if (process.env.NODE_ENV === 'development') {
        console.error('删除子域名失败:', error)
      }
      const errorMessage = error?.response?.data?.message || error?.message || '删除失败'
      toast.error(errorMessage)
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
    onSuccess: (response) => {
      toast.dismiss('batch-delete-subdomains')
      
      if (response.state === 'success' && response.data) {
        const { deletedCount } = response.data
        toast.success(`✅ 成功删除 ${deletedCount} 个子域名`)
        queryClient.invalidateQueries({ queryKey: subdomainKeys.lists() })
      } else {
        toast.error(response.message || '批量删除子域名失败')
      }
    },
    onError: (error: any) => {
      toast.dismiss('batch-delete-subdomains')
      if (process.env.NODE_ENV === 'development') {
        console.error('批量删除子域名失败:', error)
      }
      const errorMessage = error?.response?.data?.message || error?.message || '批量删除失败'
      toast.error(errorMessage)
    },
  })
}
