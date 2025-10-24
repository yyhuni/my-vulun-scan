"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { AssetService } from "@/services/asset.service"
import { OrganizationService } from "@/services/organization.service"
import type { Asset, GetAssetsResponse, GetAllAssetsParams } from "@/types/asset.types"
import type { PaginationParams } from "@/types/common.types"

// Query Keys
export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (params: PaginationParams & { organizationId?: string }) => 
    [...assetKeys.lists(), params] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: number) => [...assetKeys.details(), id] as const,
}

// 获取单个资产详情
export function useAsset(id?: number) {
  return useQuery({
    queryKey: assetKeys.detail(id || 0),
    queryFn: () => AssetService.getAssetById(id!),
    // RESTful 标准：后端直接返回 Asset 对象
    enabled: !!id,
  })
}

// 获取组织的资产列表
// 后端固定按更新时间降序排列
export function useOrganizationAssets(
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
    queryKey: ['organizations', 'detail', organizationId, 'assets', {
      page: params?.page,
      pageSize: params?.pageSize,
    }],
    queryFn: () => AssetService.getAssetsByOrgId(organizationId, {
      page: params?.page || 1,
      pageSize: params?.pageSize || 10,
    }),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    select: (response: any) => {
      // RESTful 标准：直接返回数据
      return {
        assets: response.assets || [],
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

// 创建资产
export function useCreateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      assets: Array<{
        name: string
        description?: string
      }>
      organizationId: number
    }) => AssetService.createAssets(data),
    onMutate: async () => {
      toast.loading('正在创建资产...', { id: 'create-asset' })
    },
    onSuccess: (response, variables) => {
      // 关闭加载提示
      toast.dismiss('create-asset')
      
      const { createdCount, existedCount } = response
      
      // 打印后端响应
      console.log('创建资产成功')
      console.log('后端响应:', response)
      
      // 前端自己构造提示消息
      if (existedCount > 0) {
        toast.warning(
          `成功创建 ${createdCount} 个资产（${existedCount} 个已存在）`
        )
      } else {
        toast.success(`成功创建 ${createdCount} 个资产`)
      }
      
      // 刷新所有资产和组织相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any) => {
      // 关闭加载提示
      toast.dismiss('create-asset')
      
      console.error('创建资产失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('创建资产失败，请查看控制台日志')
    },
  })
}

// 从组织中移除资产
export function useDeleteAssetFromOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { organizationId: number; assetId: number }) => 
      OrganizationService.unlinkAssetFromOrganization(data),
    onMutate: ({ organizationId, assetId }) => {
      toast.loading('正在移除资产...', { id: `delete-${organizationId}-${assetId}` })
    },
    onSuccess: (response, { organizationId, assetId }) => {
      toast.dismiss(`delete-${organizationId}-${assetId}`)
      
      // 打印后端响应
      console.log('移除资产成功')
      
      // 前端自己构造成功提示消息
      toast.success('资产已成功移除')
      
      // 刷新所有资产和组织相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any, { organizationId, assetId }) => {
      toast.dismiss(`delete-${organizationId}-${assetId}`)
      
      console.error('移除资产失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('移除资产失败，请查看控制台日志')
    },
  })
}

// 批量从组织中移除资产
export function useBatchDeleteAssetsFromOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { organizationId: number; assetIds: number[] }) => 
      AssetService.batchDeleteAssetsFromOrganization(data),
    onMutate: ({ organizationId }) => {
      toast.loading('正在批量移除资产...', { id: `batch-delete-${organizationId}` })
    },
    onSuccess: (response, { organizationId }) => {
      toast.dismiss(`batch-delete-${organizationId}`)
      
      // 打印后端响应
      console.log('批量移除资产成功')
      console.log('后端响应:', response)
      
      // 前端自己构造成功提示消息
      const successCount = response.successCount || 0
      const failedCount = response.failedCount || 0
      
      if (failedCount > 0) {
        toast.warning(`批量移除完成（成功：${successCount}，失败：${failedCount}）`)
      } else {
        toast.success(`成功移除 ${successCount} 个资产`)
      }
      
      // 刷新所有资产和组织相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any, { organizationId }) => {
      toast.dismiss(`batch-delete-${organizationId}`)
      
      console.error('批量移除资产失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('批量移除失败，请查看控制台日志')
    },
  })
}

// 删除单个资产（使用标准 RESTful DELETE）
export function useDeleteAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assetId: number) => 
      AssetService.deleteAsset(assetId),
    onMutate: (assetId) => {
      toast.loading('正在删除资产...', { id: `delete-asset-${assetId}` })
    },
    onSuccess: (_, assetId) => {
      toast.dismiss(`delete-asset-${assetId}`)
      
      console.log('删除资产成功')
      
      toast.success('资产已成功删除')
      
      // 刷新所有资产和组织相关查询
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any, assetId) => {
      toast.dismiss(`delete-asset-${assetId}`)
      
      console.error('删除资产失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      toast.error('删除资产失败，请查看控制台日志')
    },
  })
}

// 批量删除资产（独立接口，不依赖组织）
export function useBatchDeleteAssets() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (assetIds: number[]) => 
      AssetService.batchDeleteAssets(assetIds),
    onMutate: () => {
      toast.loading('正在批量删除资产...', { id: 'batch-delete-assets' })
    },
    onSuccess: (response) => {
      toast.dismiss('batch-delete-assets')
      
      // 打印后端响应
      console.log('批量删除资产成功')
      console.log('后端响应:', response)
      
      // 显示详细的删除信息
      const { deletedAssetCount, deletedDomainCount } = response
      toast.success(`成功删除 ${deletedAssetCount} 个资产（级联删除 ${deletedDomainCount} 个域名）`)
      
      // 刷新所有资产和组织相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any) => {
      toast.dismiss('batch-delete-assets')
      
      console.error('批量删除资产失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('批量删除失败，请查看控制台日志')
    },
  })
}

// 更新资产
export function useUpdateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; description?: string } }) =>
      AssetService.updateAsset({ id, ...data }),
    onMutate: ({ id }) => {
      toast.loading('正在更新资产...', { id: `update-asset-${id}` })
    },
    onSuccess: (response: any, { id }) => {
      toast.dismiss(`update-asset-${id}`)
      
      // 打印后端响应
      console.log('更新资产成功')
      console.log('后端响应:', response)
      
      toast.success('更新成功')
      
      // 刷新所有资产和组织相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any, { id }) => {
      toast.dismiss(`update-asset-${id}`)
      console.error('更新资产失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('更新资产失败，请查看控制台日志')
    },
  })
}

// 获取所有资产列表
// 后端固定按更新时间降序排列,不支持自定义排序
export function useAllAssets(
  params: GetAllAssetsParams = {},
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: ['assets', 'all', {
      page: params.page,
      pageSize: params.pageSize,
    }],
    queryFn: () => AssetService.getAllAssets(params),
    select: (response) => {
      // RESTful 标准：直接返回数据
      return {
        assets: response.assets || [],
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

// 获取资产的域名列表
export function useAssetDomains(
  assetId: number,
  params?: {
    page?: number
    pageSize?: number
  },
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: ['assets', 'detail', assetId, 'domains', {
      page: params?.page,
      pageSize: params?.pageSize,
    }],
    queryFn: () => AssetService.getDomainsByAssetId(assetId, {
      page: params?.page || 1,
      pageSize: params?.pageSize || 10,
    }),
    enabled: options?.enabled !== undefined ? options.enabled : !!assetId,
    select: (response: any) => {
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

// 获取资产的 URL 列表
export function useAssetUrls(
  assetId: number,
  params?: {
    page?: number
    pageSize?: number
  },
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: ['assets', 'detail', assetId, 'urls', {
      page: params?.page,
      pageSize: params?.pageSize,
    }],
    queryFn: () => AssetService.getUrlsByAssetId(assetId, {
      page: params?.page || 1,
      pageSize: params?.pageSize || 10,
    }),
    enabled: options?.enabled !== undefined ? options.enabled : !!assetId,
    select: (response: any) => {
      // RESTful 标准：直接返回数据
      return {
        urls: response.endpoints || [],
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
