/**
 * 代理配置 React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  getProxies,
  getProxy,
  createProxy,
  updateProxy,
  deleteProxy,
  batchDeleteProxies,
  testProxy,
  toggleProxyEnabled,
} from "@/services/proxy.service"
import type {
  Proxy,
  CreateProxyRequest,
  UpdateProxyRequest,
  TestProxyRequest,
} from "@/types/proxy.types"

// Query Keys
export const proxyKeys = {
  all: ["proxies"] as const,
  lists: () => [...proxyKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) =>
    [...proxyKeys.lists(), params] as const,
  details: () => [...proxyKeys.all, "detail"] as const,
  detail: (id: number) => [...proxyKeys.details(), id] as const,
}

/**
 * 获取代理列表
 */
export function useProxies(params?: {
  page?: number
  pageSize?: number
  search?: string
  type?: string
  isEnabled?: boolean
}) {
  return useQuery({
    queryKey: proxyKeys.list(params),
    queryFn: () => getProxies(params),
  })
}

/**
 * 获取单个代理
 */
export function useProxy(id: number) {
  return useQuery({
    queryKey: proxyKeys.detail(id),
    queryFn: () => getProxy(id),
    enabled: !!id,
  })
}

/**
 * 创建代理
 */
export function useCreateProxy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateProxyRequest) => createProxy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.lists() })
      toast.success("代理创建成功")
    },
    onError: (error: Error) => {
      toast.error(`创建代理失败: ${error.message}`)
    },
  })
}

/**
 * 更新代理
 */
export function useUpdateProxy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProxyRequest }) =>
      updateProxy(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: proxyKeys.detail(variables.id),
      })
      toast.success("代理更新成功")
    },
    onError: (error: Error) => {
      toast.error(`更新代理失败: ${error.message}`)
    },
  })
}

/**
 * 删除代理
 */
export function useDeleteProxy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteProxy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.lists() })
      toast.success("代理删除成功")
    },
    onError: (error: Error) => {
      toast.error(`删除代理失败: ${error.message}`)
    },
  })
}

/**
 * 批量删除代理
 */
export function useBatchDeleteProxies() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: number[]) => batchDeleteProxies(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.lists() })
      toast.success(`成功删除 ${ids.length} 个代理`)
    },
    onError: (error: Error) => {
      toast.error(`批量删除失败: ${error.message}`)
    },
  })
}

/**
 * 测试代理连接
 */
export function useTestProxy() {
  return useMutation({
    mutationFn: (data: TestProxyRequest) => testProxy(data),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(
          `连接成功${result.responseTime ? ` (${result.responseTime}ms)` : ""}`
        )
      } else {
        toast.error(`连接失败: ${result.message}`)
      }
    },
    onError: (error: Error) => {
      toast.error(`测试失败: ${error.message}`)
    },
  })
}

/**
 * 切换代理启用状态
 */
export function useToggleProxyEnabled() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) =>
      toggleProxyEnabled(id, isEnabled),
    onSuccess: (proxy) => {
      queryClient.invalidateQueries({ queryKey: proxyKeys.lists() })
      toast.success(proxy.isEnabled ? "代理已启用" : "代理已禁用")
    },
    onError: (error: Error) => {
      toast.error(`操作失败: ${error.message}`)
    },
  })
}
