"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { UrlService } from "@/services/url.service"
import type { 
  Url, 
  CreateUrlRequest,
  UpdateUrlRequest,
  GetUrlsRequest,
  GetUrlsResponse,
  BatchDeleteUrlsRequest,
  BatchDeleteUrlsResponse
} from "@/types/url.types"

// Query Keys
export const urlKeys = {
  all: ['urls'] as const,
  lists: () => [...urlKeys.all, 'list'] as const,
  list: (params: GetUrlsRequest) => 
    [...urlKeys.lists(), params] as const,
  details: () => [...urlKeys.all, 'detail'] as const,
  detail: (id: number) => [...urlKeys.details(), id] as const,
  byDomain: (domainId: number, params: GetUrlsRequest) => 
    [...urlKeys.all, 'domain', domainId, params] as const,
  bySubdomain: (subdomainId: number, params: GetUrlsRequest) => 
    [...urlKeys.all, 'subdomain', subdomainId, params] as const,
}

// 获取单个 URL 详情
export function useUrl(id: number) {
  return useQuery({
    queryKey: urlKeys.detail(id),
    queryFn: () => UrlService.getUrlById(id),
    select: (response) => {
      // RESTful 标准：直接返回数据
      return response as Url
    },
    enabled: !!id,
  })
}

// 获取 URL 列表
export function useUrls(params?: GetUrlsRequest) {
  const defaultParams: GetUrlsRequest = {
    page: 1,
    pageSize: 10,
    ...params
  }
  
  return useQuery({
    queryKey: urlKeys.list(defaultParams),
    queryFn: () => UrlService.getUrls(defaultParams),
    select: (response) => {
      // RESTful 标准：直接返回数据
      return response as GetUrlsResponse
    },
  })
}

// 根据域名ID获取 URL 列表（使用专用路由）
export function useUrlsByDomain(domainId: number, params?: Omit<GetUrlsRequest, 'domainId'>) {
  const defaultParams: GetUrlsRequest = {
    page: 1,
    pageSize: 10,
    ...params
  }
  
  return useQuery({
    queryKey: urlKeys.byDomain(domainId, defaultParams),
    queryFn: () => UrlService.getUrlsByDomainId(domainId, defaultParams),
    select: (response) => {
      // RESTful 标准：直接返回数据
      return response as GetUrlsResponse
    },
    enabled: !!domainId,
  })
}

// 根据子域名ID获取 URL 列表（使用专用路由）
export function useUrlsBySubdomain(subdomainId: number, params?: Omit<GetUrlsRequest, 'subdomainId'>) {
  const defaultParams: GetUrlsRequest = {
    page: 1,
    pageSize: 10,
    ...params
  }
  
  return useQuery({
    queryKey: urlKeys.bySubdomain(subdomainId, defaultParams),
    queryFn: () => UrlService.getUrlsBySubdomainId(subdomainId, defaultParams),
    select: (response) => {
      // RESTful 标准：直接返回数据
      return response as GetUrlsResponse
    },
    enabled: !!subdomainId,
  })
}

// 创建 URL（完全自动化）
export function useCreateUrl() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      urls: Array<CreateUrlRequest>
    }) => UrlService.createUrls(data),
    onMutate: async () => {
      toast.loading('正在创建 URL...', { id: 'create-url' })
    },
    onSuccess: (response) => {
      // 关闭加载提示
      toast.dismiss('create-url')
      
      const { createdCount, existedCount } = response
      
      // 打印后端响应
      console.log('创建 URL 成功')
      console.log('后端响应:', response)
      
      // 前端自己构造成功提示消息
      if (existedCount > 0) {
        toast.warning(
          `成功创建 ${createdCount} 个 URL（${existedCount} 个已存在）`
        )
      } else {
        toast.success(`成功创建 ${createdCount} 个 URL`)
      }
      
      // 刷新所有 URL 相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['urls'] })
    },
    onError: (error: any) => {
      // 关闭加载提示
      toast.dismiss('create-url')
      
      console.error('创建 URL 失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('创建 URL 失败，请查看控制台日志')
    },
  })
}

// 删除单个 URL
export function useDeleteUrl() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => UrlService.deleteUrl(id),
    onMutate: (id) => {
      toast.loading('正在删除 URL...', { id: `delete-url-${id}` })
    },
    onSuccess: (response, id) => {
      toast.dismiss(`delete-url-${id}`)
      
      // 打印后端响应
      console.log('删除 URL 成功')
      
      toast.success('删除成功')
      
      // 刷新所有 URL 相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['urls'] })
    },
    onError: (error: any, id) => {
      toast.dismiss(`delete-url-${id}`)
      
      console.error('删除 URL 失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('删除 URL 失败，请查看控制台日志')
    },
  })
}

// 批量删除 URL
export function useBatchDeleteUrls() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: BatchDeleteUrlsRequest) => UrlService.batchDeleteUrls(data),
    onMutate: () => {
      toast.loading('正在批量删除 URL...', { id: 'batch-delete-urls' })
    },
    onSuccess: (response) => {
      toast.dismiss('batch-delete-urls')
      
      // 打印后端响应
      console.log('批量删除 URL 成功')
      console.log('后端响应:', response)
      
      const { deletedCount } = response
      toast.success(`成功删除 ${deletedCount} 个 URL`)
      
      // 刷新所有 URL 相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['urls'] })
    },
    onError: (error: any) => {
      toast.dismiss('batch-delete-urls')
      
      console.error('批量删除 URL 失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('批量删除失败，请查看控制台日志')
    },
  })
}
