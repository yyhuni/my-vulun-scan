/**
 * Targets Hooks - 目标管理相关 hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getTargets,
  getTargetById,
  createTarget,
  updateTarget,
  deleteTarget,
  batchDeleteTargets,
  getTargetOrganizations,
  linkTargetOrganizations,
  unlinkTargetOrganizations,
  getTargetDomains,
  getTargetEndpoints,
} from '@/services/target.service'
import type {
  CreateTargetRequest,
  UpdateTargetRequest,
  BatchDeleteTargetsRequest,
} from '@/types/target.types'

/**
 * 获取所有目标列表
 */
export function useTargets(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['targets', page, pageSize],
    queryFn: () => getTargets(page, pageSize),
  })
}

/**
 * 获取单个目标详情
 */
export function useTarget(id: number) {
  return useQuery({
    queryKey: ['targets', id],
    queryFn: () => getTargetById(id),
    enabled: !!id,
  })
}

/**
 * 创建目标
 */
export function useCreateTarget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTargetRequest) => createTarget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] })
      toast.success('目标创建成功')
    },
    onError: (error: Error) => {
      toast.error(`创建失败: ${error.message}`)
    },
  })
}

/**
 * 更新目标
 */
export function useUpdateTarget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTargetRequest }) =>
      updateTarget(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['targets'] })
      queryClient.invalidateQueries({ queryKey: ['targets', variables.id] })
      toast.success('目标更新成功')
    },
    onError: (error: Error) => {
      toast.error(`更新失败: ${error.message}`)
    },
  })
}

/**
 * 删除目标
 */
export function useDeleteTarget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteTarget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] })
      toast.success('目标删除成功')
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`)
    },
  })
}

/**
 * 批量删除目标
 */
export function useBatchDeleteTargets() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: BatchDeleteTargetsRequest) => batchDeleteTargets(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['targets'] })
      toast.success(`成功删除 ${response.deletedCount} 个目标`)
    },
    onError: (error: Error) => {
      toast.error(`批量删除失败: ${error.message}`)
    },
  })
}

/**
 * 获取目标的组织列表
 */
export function useTargetOrganizations(targetId: number, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['targets', targetId, 'organizations', page, pageSize],
    queryFn: () => getTargetOrganizations(targetId, page, pageSize),
    enabled: !!targetId,
  })
}

/**
 * 关联目标与组织
 */
export function useLinkTargetOrganizations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ targetId, organizationIds }: { targetId: number; organizationIds: number[] }) =>
      linkTargetOrganizations(targetId, organizationIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['targets', variables.targetId, 'organizations'] })
      queryClient.invalidateQueries({ queryKey: ['targets', variables.targetId] })
      toast.success('组织关联成功')
    },
    onError: (error: Error) => {
      toast.error(`关联失败: ${error.message}`)
    },
  })
}

/**
 * 取消目标与组织的关联
 */
export function useUnlinkTargetOrganizations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ targetId, organizationIds }: { targetId: number; organizationIds: number[] }) =>
      unlinkTargetOrganizations(targetId, organizationIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['targets', variables.targetId, 'organizations'] })
      queryClient.invalidateQueries({ queryKey: ['targets', variables.targetId] })
      toast.success('取消关联成功')
    },
    onError: (error: Error) => {
      toast.error(`取消关联失败: ${error.message}`)
    },
  })
}

/**
 * 获取目标的域名列表
 */
export function useTargetDomains(
  targetId: number,
  params?: {
    page?: number
    pageSize?: number
  },
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: ['targets', 'detail', targetId, 'domains', {
      page: params?.page,
      pageSize: params?.pageSize,
    }],
    queryFn: () => getTargetDomains(targetId, params?.page || 1, params?.pageSize || 10),
    enabled: options?.enabled !== undefined ? options.enabled : !!targetId,
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

/**
 * 获取目标的端点列表
 */
export function useTargetEndpoints(
  targetId: number,
  params?: {
    page?: number
    pageSize?: number
  },
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: ['targets', 'detail', targetId, 'endpoints', {
      page: params?.page,
      pageSize: params?.pageSize,
    }],
    queryFn: () => getTargetEndpoints(targetId, params?.page || 1, params?.pageSize || 10),
    enabled: options?.enabled !== undefined ? options.enabled : !!targetId,
    select: (response: any) => {
      // RESTful 标准：直接返回数据
      return {
        endpoints: response.endpoints || [],
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

