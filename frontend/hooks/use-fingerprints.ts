/**
 * 指纹管理 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { FingerprintService } from "@/services/fingerprint.service"
import type { EholeFingerprint, FingerprintStats } from "@/types/fingerprint.types"

// Query Keys
export const fingerprintKeys = {
  all: ["fingerprints"] as const,
  stats: () => [...fingerprintKeys.all, "stats"] as const,
  ehole: {
    all: () => [...fingerprintKeys.all, "ehole"] as const,
    list: (params: any) => [...fingerprintKeys.ehole.all(), "list", params] as const,
    detail: (id: number) => [...fingerprintKeys.ehole.all(), "detail", id] as const,
  },
}

// ==================== EHole Hooks ====================

/**
 * 获取 EHole 指纹列表
 */
export function useEholeFingerprints(
  params: { page?: number; pageSize?: number; filter?: string } = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: fingerprintKeys.ehole.list(params),
    queryFn: () => FingerprintService.getEholeFingerprints(params),
    ...options,
  })
}

/**
 * 获取 EHole 指纹详情
 */
export function useEholeFingerprint(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: fingerprintKeys.ehole.detail(id),
    queryFn: () => FingerprintService.getEholeFingerprint(id),
    enabled: id > 0 && options?.enabled !== false,
  })
}

/**
 * 创建 EHole 指纹
 */
export function useCreateEholeFingerprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<EholeFingerprint, 'id' | 'createdAt'>) => 
      FingerprintService.createEholeFingerprint(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fingerprintKeys.ehole.all() })
      queryClient.invalidateQueries({ queryKey: fingerprintKeys.stats() })
    },
  })
}

/**
 * 更新 EHole 指纹
 */
export function useUpdateEholeFingerprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EholeFingerprint> }) =>
      FingerprintService.updateEholeFingerprint(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: fingerprintKeys.ehole.all() })
      queryClient.invalidateQueries({ queryKey: fingerprintKeys.ehole.detail(id) })
    },
  })
}

/**
 * 删除 EHole 指纹
 */
export function useDeleteEholeFingerprint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => FingerprintService.deleteEholeFingerprint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fingerprintKeys.ehole.all() })
      queryClient.invalidateQueries({ queryKey: fingerprintKeys.stats() })
    },
  })
}

/**
 * 批量创建 EHole 指纹
 */
export function useBatchCreateEholeFingerprints() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fingerprints: Omit<EholeFingerprint, 'id' | 'createdAt'>[]) =>
      FingerprintService.batchCreateEholeFingerprints(fingerprints),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fingerprintKeys.ehole.all() })
      queryClient.invalidateQueries({ queryKey: fingerprintKeys.stats() })
    },
  })
}

/**
 * 文件导入 EHole 指纹
 */
export function useImportEholeFingerprints() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => FingerprintService.importEholeFingerprints(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fingerprintKeys.ehole.all() })
      queryClient.invalidateQueries({ queryKey: fingerprintKeys.stats() })
    },
  })
}

/**
 * 批量删除 EHole 指纹
 */
export function useBulkDeleteEholeFingerprints() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => FingerprintService.bulkDeleteEholeFingerprints(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fingerprintKeys.ehole.all() })
      queryClient.invalidateQueries({ queryKey: fingerprintKeys.stats() })
    },
  })
}

/**
 * 删除所有 EHole 指纹
 */
export function useDeleteAllEholeFingerprints() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => FingerprintService.deleteAllEholeFingerprints(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fingerprintKeys.ehole.all() })
      queryClient.invalidateQueries({ queryKey: fingerprintKeys.stats() })
    },
  })
}

// ==================== 统计 Hooks ====================

/**
 * 获取指纹库统计
 */
export function useFingerprintStats() {
  return useQuery({
    queryKey: fingerprintKeys.stats(),
    queryFn: () => FingerprintService.getStats(),
  })
}
