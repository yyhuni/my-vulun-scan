import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { OrganizationService } from '@/services/organization.service'
import type { Organization, CreateOrganizationRequest, UpdateOrganizationRequest } from '@/types/organization.types'

// Query Keys - 统一管理查询键
export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  list: (params?: any) => [...organizationKeys.lists(), params] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (id: number) => [...organizationKeys.details(), id] as const,
}

/**
 * 获取组织列表的 Hook
 * 
 * 功能：
 * - 自动管理加载状态
 * - 自动错误处理
 * - 支持分页和排序
 * - 自动缓存和重新验证
 * - 支持条件查询（enabled 选项）
 */
export function useOrganizations(
  params?: {
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  },
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: organizationKeys.list(params),
    queryFn: () => OrganizationService.getOrganizations(params || {}),
    select: (response) => {
      if (response.state === 'success' && response.data) {
        // 类型守卫：检查是否为列表响应
        if ('organizations' in response.data) {
          return {
            organizations: response.data.organizations || [],
            pagination: {
              total: response.data.total || 0,
              page: response.data.page || 1,
              pageSize: response.data.pageSize || 10,
              totalPages: response.data.totalPages || 0,
            }
          }
        }
      }
      throw new Error(response.message || '获取组织列表失败')
    },
    enabled: options?.enabled !== undefined ? options.enabled : true,
    throwOnError: true,
  })
}

/**
 * 获取单个组织详情的 Hook
 */
export function useOrganization(id: number) {
  return useQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: () => OrganizationService.getOrganizationById(id),
    select: (response) => {
      if (response.state === 'success' && response.data) {
        return response.data as Organization
      }
      throw new Error(response.message || '获取组织详情失败')
    },
    enabled: !!id, // 只有当 id 存在时才执行查询
    throwOnError: true,
  })
}

/**
 * 获取组织的域名列表 Hook
 */
export function useOrganizationDomains(
  id: number,
  params?: {
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  },
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: [...organizationKeys.detail(id), 'domains', params],
    queryFn: () => OrganizationService.getOrganizationDomains(id, params),
    select: (response) => {
      if (response.state === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || '获取组织域名列表失败')
    },
    enabled: options?.enabled !== undefined ? (options.enabled && !!id) : !!id,
    throwOnError: true,
  })
}

/**
 * 创建组织的 Mutation Hook
 * 
 * 功能：
 * - 自动管理提交状态
 * - 成功后自动刷新列表
 * - 自动显示成功/失败提示
 */
export function useCreateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateOrganizationRequest) => 
      OrganizationService.createOrganization(data),
    onMutate: (data) => {
      // 显示创建开始的提示
      toast.loading('正在创建组织...', { id: 'create-organization' })
    },
    onSuccess: (response, variables) => {
      // 关闭加载提示
      toast.dismiss('create-organization')
      
      if (response.state === 'success' && response.data) {
        // 打印后端响应
        console.log('创建组织成功')
        console.log('后端响应:', response)
        
        // 刷新组织列表
        queryClient.invalidateQueries({ queryKey: organizationKeys.lists() })
        
        // 显示成功提示
        toast.success('创建成功')
        
        return response.data
      } else {
        throw new Error(response.message || '创建组织失败')
      }
    },
    onError: (error: any) => {
      // 关闭加载提示
      toast.dismiss('create-organization')
      
      console.error('创建组织失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('创建组织失败，请稍后重试')
    },
  })
}

/**
 * 更新组织的 Mutation Hook
 */
export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateOrganizationRequest }) =>
      OrganizationService.updateOrganization({ id, ...data }),
    onMutate: ({ id, data }) => {
      // 显示更新开始的提示
      toast.loading('正在更新组织...', { id: `update-${id}` })
    },
    onSuccess: (response, { id }) => {
      // 关闭加载提示
      toast.dismiss(`update-${id}`)
      
      if (response.state === 'success' && response.data) {
        // 打印后端响应
        console.log('更新组织成功')
        console.log('后端响应:', response)
        
        // 刷新组织详情和列表（使用 invalidateQueries 确保数据一致性）
        queryClient.invalidateQueries({ queryKey: organizationKeys.detail(id) })
        queryClient.invalidateQueries({ queryKey: organizationKeys.lists() })
        
        // 显示成功提示
        toast.success('更新成功')
        
        return response.data
      } else {
        throw new Error(response.message || '更新组织失败')
      }
    },
    onError: (error: any, { id }) => {
      // 关闭加载提示
      toast.dismiss(`update-${id}`)
      
      console.error('更新组织失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('更新组织失败，请稍后重试')
    },
  })
}

/**
 * 删除组织的 Mutation Hook（乐观更新）
 */
export function useDeleteOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => OrganizationService.deleteOrganization(id),
    onMutate: async (deletedId) => {
      // 显示删除开始的提示
      toast.loading('正在删除组织...', { id: `delete-${deletedId}` })
      
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: organizationKeys.lists() })

      // 获取当前数据作为备份
      const previousData = queryClient.getQueriesData({ queryKey: organizationKeys.lists() })

      // 乐观更新：从所有列表查询中移除该组织
      queryClient.setQueriesData(
        { queryKey: organizationKeys.lists() },
        (old: any) => {
          if (old?.organizations) {
            return {
              ...old,
              organizations: old.organizations.filter((org: Organization) => org.id !== deletedId)
            }
          }
          return old
        }
      )

      // 返回备份数据用于回滚
      return { previousData, deletedId }
    },
    onSuccess: (response, deletedId, context) => {
      // 关闭加载提示
      toast.dismiss(`delete-${deletedId}`)
      
      if (response.state === 'success') {
        // 打印后端响应
        console.log('删除组织成功')
        console.log('后端响应:', response)
        
        toast.success('删除成功')
      } else {
        throw new Error(response.message || '删除组织失败')
      }
    },
    onError: (error: any, deletedId, context) => {
      // 关闭加载提示
      toast.dismiss(`delete-${deletedId}`)
      
      // 回滚乐观更新
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      
      console.error('删除组织失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('删除组织失败，请稍后重试')
    },
    onSettled: () => {
      // 无论成功失败都刷新数据
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() })
    },
  })
}

/**
 * 批量删除组织的 Mutation Hook（乐观更新）
 */
export function useBatchDeleteOrganizations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: number[]) => 
      OrganizationService.batchDeleteOrganizations(ids),
    onMutate: async (deletedIds) => {
      // 显示批量删除开始的提示
      toast.loading('正在批量删除组织...', { id: 'batch-delete' })
      
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: organizationKeys.lists() })

      // 获取当前数据作为备份
      const previousData = queryClient.getQueriesData({ queryKey: organizationKeys.lists() })

      // 乐观更新：从所有列表查询中移除这些组织
      queryClient.setQueriesData(
        { queryKey: organizationKeys.lists() },
        (old: any) => {
          if (old?.organizations) {
            return {
              ...old,
              organizations: old.organizations.filter(
                (org: Organization) => !deletedIds.includes(org.id)
              )
            }
          }
          return old
        }
      )

      // 返回备份数据用于回滚
      return { previousData, deletedIds }
    },
    onSuccess: (response, deletedIds) => {
      // 关闭加载提示
      toast.dismiss('batch-delete')
      
      if (response.state === 'success') {
        // 打印后端响应
        console.log('批量删除组织成功')
        console.log('后端响应:', response)
        
        toast.success('批量删除成功')
      } else {
        throw new Error(response.message || '批量删除组织失败')
      }
    },
    onError: (error: any, deletedIds, context) => {
      // 关闭加载提示
      toast.dismiss('batch-delete')
      
      // 回滚乐观更新
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
      
      console.error('批量删除组织失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('批量删除失败，请稍后重试')
    },
    onSettled: () => {
      // 无论成功失败都刷新数据
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() })
    },
  })
}
