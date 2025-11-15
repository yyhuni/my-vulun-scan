import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Directory, DirectoryListResponse } from '@/types/directory.types'

// API 服务函数
const directoryService = {
  // 获取目标的目录列表
  getTargetDirectories: async (
    targetId: number,
    params: { page: number; pageSize: number }
  ): Promise<DirectoryListResponse> => {
    const response = await fetch(
      `/api/targets/${targetId}/directories/?page=${params.page}&page_size=${params.pageSize}`
    )
    if (!response.ok) {
      throw new Error('获取目录列表失败')
    }
    return response.json()
  },

  // 获取扫描的目录列表
  getScanDirectories: async (
    scanId: number,
    params: { page: number; pageSize: number }
  ): Promise<DirectoryListResponse> => {
    const response = await fetch(
      `/api/scans/${scanId}/directories/?page=${params.page}&page_size=${params.pageSize}`
    )
    if (!response.ok) {
      throw new Error('获取目录列表失败')
    }
    return response.json()
  },

  // 删除目录
  deleteDirectory: async (directoryId: number): Promise<void> => {
    const response = await fetch(`/api/directories/${directoryId}/`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('删除目录失败')
    }
  },

  // 批量删除目录
  bulkDeleteDirectories: async (directoryIds: number[]): Promise<void> => {
    const response = await fetch('/api/directories/bulk-delete/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: directoryIds }),
    })
    if (!response.ok) {
      throw new Error('批量删除目录失败')
    }
  },
}

// 获取目标的目录列表
export function useTargetDirectories(
  targetId: number,
  params: { page: number; pageSize: number },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['target-directories', targetId, params],
    queryFn: () => directoryService.getTargetDirectories(targetId, params),
    enabled: options?.enabled ?? true,
  })
}

// 获取扫描的目录列表
export function useScanDirectories(
  scanId: number,
  params: { page: number; pageSize: number },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['scan-directories', scanId, params],
    queryFn: () => directoryService.getScanDirectories(scanId, params),
    enabled: options?.enabled ?? true,
  })
}

// 删除目录
export function useDeleteDirectory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: directoryService.deleteDirectory,
    onSuccess: () => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: ['target-directories'] })
      queryClient.invalidateQueries({ queryKey: ['scan-directories'] })
      toast.success('目录删除成功')
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除目录失败')
    },
  })
}

// 批量删除目录
export function useBulkDeleteDirectories() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: directoryService.bulkDeleteDirectories,
    onSuccess: () => {
      // 刷新相关查询
      queryClient.invalidateQueries({ queryKey: ['target-directories'] })
      queryClient.invalidateQueries({ queryKey: ['scan-directories'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '批量删除目录失败')
    },
  })
}
