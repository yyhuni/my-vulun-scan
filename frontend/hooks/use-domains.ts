"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { DomainService } from "@/services/domain.service"
import { OrganizationService } from "@/services/organization.service"
import type { Asset } from "@/types/asset.types"
import type { Domain, GetDomainsResponse, GetAllDomainsParams } from "@/types/domain.types"
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
    // RESTful 标准：后端直接返回 Domain 对象
    enabled: !!id,
  })
}

// 获取组织的域名列表
// 后端固定按更新时间降序排列
export function useOrganizationDomains(
  organizationId: number,
  params?: {
    page?: number
    pageSize?: number
  },
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: ['organizations', 'detail', organizationId, 'domains', {
      page: params?.page,
      pageSize: params?.pageSize,
    }],
    queryFn: () => DomainService.getDomainsByOrgId(organizationId, {
      page: params?.page || 1,
      pageSize: params?.pageSize || 10,
    }),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    select: (response) => {
      // RESTful 标准：直接返回数据
      return {
        domains: response.domains || [],
        pagination: {
          total: response.total || 0,
          page: response.page || 1,
          pageSize: response.pageSize || 10,
          totalPages: response.totalPages || 0,
        }
      }
    },
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
      
      const { createdCount, existedCount } = response
      
      // 打印后端响应
      console.log('创建域名成功')
      console.log('后端响应:', response)
      
      // 前端自己构造提示消息
      if (existedCount > 0) {
        toast.warning(
          `成功创建 ${createdCount} 个域名（${existedCount} 个已存在）`
        )
      } else {
        toast.success(`成功创建 ${createdCount} 个域名`)
      }
      
      // 刷新所有域名和组织相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any) => {
      // 关闭加载提示
      toast.dismiss('create-domain')
      
      console.error('创建域名失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('创建域名失败，请查看控制台日志')
    },
  })
}

// 从组织中移除域名
export function useDeleteDomainFromOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { organizationId: number; domainId: number }) => 
      OrganizationService.unlinkDomainFromOrganization(data),
    onMutate: ({ organizationId, domainId }) => {
      toast.loading('正在移除域名...', { id: `delete-${organizationId}-${domainId}` })
    },
    onSuccess: (response, { organizationId, domainId }) => {
      toast.dismiss(`delete-${organizationId}-${domainId}`)
      
      // 打印后端响应
      console.log('移除域名成功')
      
      // 前端自己构造成功提示消息
      toast.success('域名已成功移除')
      
      // 刷新所有域名和组织相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any, { organizationId, domainId }) => {
      toast.dismiss(`delete-${organizationId}-${domainId}`)
      
      console.error('移除域名失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('移除域名失败，请查看控制台日志')
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
      
      // 打印后端响应
      console.log('批量移除域名成功')
      console.log('后端响应:', response)
      
      // 前端自己构造成功提示消息
      const successCount = response.successCount || 0
      const failedCount = response.failedCount || 0
      
      if (failedCount > 0) {
        toast.warning(`批量移除完成（成功：${successCount}，失败：${failedCount}）`)
      } else {
        toast.success(`成功移除 ${successCount} 个域名`)
      }
      
      // 刷新所有域名和组织相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any, { organizationId }) => {
      toast.dismiss(`batch-delete-${organizationId}`)
      
      console.error('批量移除域名失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('批量移除失败，请查看控制台日志')
    },
  })
}

// 删除单个域名（使用标准 RESTful DELETE）
export function useDeleteDomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (domainId: number) => 
      DomainService.deleteDomain(domainId),
    onMutate: (domainId) => {
      toast.loading('正在删除域名...', { id: `delete-domain-${domainId}` })
    },
    onSuccess: (_, domainId) => {
      toast.dismiss(`delete-domain-${domainId}`)
      
      console.log('删除域名成功')
      
      toast.success('域名已成功删除')
      
      // 刷新所有域名和组织相关查询
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any, domainId) => {
      toast.dismiss(`delete-domain-${domainId}`)
      
      console.error('删除域名失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      toast.error('删除域名失败，请查看控制台日志')
    },
  })
}

// 批量删除域名（独立接口，不依赖组织）
export function useBatchDeleteDomains() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (domainIds: number[]) => 
      DomainService.batchDeleteDomains(domainIds),
    onMutate: () => {
      toast.loading('正在批量删除域名...', { id: 'batch-delete-domains' })
    },
    onSuccess: (response) => {
      toast.dismiss('batch-delete-domains')
      
      // 打印后端响应
      console.log('批量删除域名成功')
      console.log('后端响应:', response)
      
      // 显示详细的删除信息
      const { deletedDomainCount, deletedSubdomainCount } = response
      toast.success(`成功删除 ${deletedDomainCount} 个域名（级联删除 ${deletedSubdomainCount} 个子域名）`)
      
      // 刷新所有域名和组织相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any) => {
      toast.dismiss('batch-delete-domains')
      
      console.error('批量删除域名失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('批量删除失败，请查看控制台日志')
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
      
      // 打印后端响应
      console.log('更新域名成功')
      console.log('后端响应:', response)
      
      toast.success('更新成功')
      
      // 刷新所有域名和组织相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any, { id }) => {
      toast.dismiss(`update-domain-${id}`)
      console.error('更新域名失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('更新域名失败，请查看控制台日志')
    },
  })
}

// 获取所有域名列表
// 后端固定按更新时间降序排列，不支持自定义排序
export function useAllDomains(
  params: GetAllDomainsParams = {},
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: ['domains', 'all', {
      page: params.page,
      pageSize: params.pageSize,
    }],
    queryFn: () => DomainService.getAllDomains(params),
    select: (response) => {
      // RESTful 标准：直接返回数据
      return {
        domains: response.domains || [],
        pagination: {
          total: response.total || 0,
          page: response.page || 1,
          pageSize: response.pageSize || 10,
          totalPages: response.totalPages || 0,
        }
      }
    },
    enabled: options?.enabled !== undefined ? options.enabled : true,
  })
}
