import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { WebSite, WebSiteListResponse } from '@/types/website.types'

// API 服务函数
const websiteService = {
  // 获取目标的网站列表
  getTargetWebSites: async (
    targetId: number,
    params: { page: number; pageSize: number }
  ): Promise<WebSiteListResponse> => {
    const response = await fetch(
      `/api/targets/${targetId}/websites/?page=${params.page}&page_size=${params.pageSize}`
    )
    if (!response.ok) {
      throw new Error('获取网站列表失败')
    }
    return response.json()
  },

  // 获取扫描的网站列表
  getScanWebSites: async (
    scanId: number,
    params: { page: number; pageSize: number }
  ): Promise<WebSiteListResponse> => {
    const response = await fetch(
      `/api/scans/${scanId}/websites/?page=${params.page}&page_size=${params.pageSize}`
    )
    if (!response.ok) {
      throw new Error('获取网站列表失败')
    }
    return response.json()
  },

  // 删除网站
  deleteWebSite: async (websiteId: number): Promise<void> => {
    const response = await fetch(`/api/websites/${websiteId}/`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('删除网站失败')
    }
  },

  // 批量删除网站
  bulkDeleteWebSites: async (websiteIds: number[]): Promise<void> => {
    const response = await fetch('/api/websites/bulk-delete/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: websiteIds }),
    })
    if (!response.ok) {
      throw new Error('批量删除网站失败')
    }
  },
}

// 获取目标的网站列表
export function useTargetWebSites(
  targetId: number,
  params: { page: number; pageSize: number },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['target-websites', targetId, params],
    queryFn: () => websiteService.getTargetWebSites(targetId, params),
    enabled: options?.enabled ?? true,
  })
}

// 获取扫描的网站列表
export function useScanWebSites(
  scanId: number,
  params: { page: number; pageSize: number },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['scan-websites', scanId, params],
    queryFn: () => websiteService.getScanWebSites(scanId, params),
    enabled: options?.enabled ?? true,
  })
}

// 删除网站
export function useDeleteWebSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: websiteService.deleteWebSite,
    onSuccess: () => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: ['target-websites'] })
      queryClient.invalidateQueries({ queryKey: ['scan-websites'] })
      toast.success('网站删除成功')
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除网站失败')
    },
  })
}

// 批量删除网站
export function useBulkDeleteWebSites() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: websiteService.bulkDeleteWebSites,
    onSuccess: () => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: ['target-websites'] })
      queryClient.invalidateQueries({ queryKey: ['scan-websites'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '批量删除网站失败')
    },
  })
}
