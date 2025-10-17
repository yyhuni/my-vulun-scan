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
    queryKey: [
      'subdomains',
      params.organizationId ? { organizationId: params.organizationId } : null,
      params.domainId ? { domainId: params.domainId } : null,
      {
        page: params.page,
        pageSize: params.pageSize,
      }
    ],
    queryFn: async () => {
      // 根据参数选择不同的API端点
      if (params.organizationId) {
        // 获取组织的子域名
        return SubDomainService.getSubDomainsByOrganization(
          parseInt(params.organizationId),
          {
            page: params.page,
            pageSize: params.pageSize,
          }
        )
      } else if (params.domainId) {
        // 获取域名的子域名
        return SubDomainService.getSubDomainsByDomain(
          parseInt(params.domainId),
          {
            page: params.page,
            pageSize: params.pageSize,
          }
        )
      } else {
        // 获取所有子域名
        return SubDomainService.getSubDomains({
          page: params.page,
          pageSize: params.pageSize,
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

// 创建子域名（为指定域名批量添加子域名 - 新接口）
export function useCreateSubdomainForDomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      domainId: number
      subdomains: string[]
    }) => {
      return SubDomainService.createSubDomainsForDomain({
        domainId: data.domainId,
        subdomains: data.subdomains
      })
    },
    onMutate: async () => {
      toast.loading('正在创建子域名...', { id: 'create-subdomain-for-domain' })
    },
    onSuccess: (response) => {
      // 关闭加载提示
      toast.dismiss('create-subdomain-for-domain')
      
      if (response.state === 'success' && response.data) {
        const { newCreated, alreadyExisted } = response.data
        
        // 打印后端响应
        console.log('创建子域名成功')
        console.log('后端响应:', response)
        
        // 根据不同情况构建友好的消息
        if (newCreated > 0) {
          let message = `✅ 成功创建 ${newCreated} 个子域名`
          
          if (alreadyExisted > 0) {
            message += `\n⚠️ ${alreadyExisted} 个已存在`
          }
          
          toast.success(message, { duration: 4000 })
        } else if (alreadyExisted > 0) {
          toast.info(`📝 所有 ${alreadyExisted} 个子域名已存在`, { duration: 3000 })
        } else {
          toast.success('操作成功')
        }
        
        // 刷新所有子域名相关查询（通配符匹配）
        queryClient.invalidateQueries({ queryKey: ['subdomains'] })
      } else {
        toast.error(response.message || '创建子域名失败')
      }
    },
    onError: (error: any) => {
      toast.dismiss('create-subdomain-for-domain')
      
      console.error('创建子域名失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('创建子域名失败，请稍后重试')
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
        // 打印后端响应
        console.log('删除子域名成功')
        console.log('后端响应:', response)
        
        toast.success('✅ 删除成功')
        // 刷新所有子域名相关查询（通配符匹配）
        queryClient.invalidateQueries({ queryKey: ['subdomains'] })
      } else {
        toast.error(response.message || '删除子域名失败')
      }
    },
    onError: (error: any, id) => {
      toast.dismiss(`delete-subdomain-${id}`)
      console.error('删除子域名失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      // 前端自己构造错误提示
      toast.error('删除子域名失败，请稍后重试')
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
        // 打印后端响应
        console.log('批量删除子域名成功')
        console.log('后端响应:', response)
        
        const { deletedCount } = response.data
        toast.success(`✅ 成功删除 ${deletedCount} 个子域名`)
        // 刷新所有子域名相关查询（通配符匹配）
        queryClient.invalidateQueries({ queryKey: ['subdomains'] })
      } else {
        toast.error(response.message || '批量删除子域名失败')
      }
    },
    onError: (error: any) => {
      toast.dismiss('batch-delete-subdomains')
      console.error('批量删除子域名失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      // 前端自己构造错误提示
      toast.error('批量删除失败，请稍后重试')
    },
  })
}
