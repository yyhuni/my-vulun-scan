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
 * - 支持分页
 * - 自动缓存和重新验证
 * - 支持条件查询（enabled 选项）
 */
// 后端固定按更新时间降序排列，不支持自定义排序
export function useOrganizations(
  params: {
    page?: number
    pageSize?: number
  } = {},
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: ['organizations', {
      page: params.page || 1,
      pageSize: params.pageSize || 10,
    }],
    queryFn: () => OrganizationService.getOrganizations(params || {}),
    select: (response) => {
      // RESTful 标准：直接返回数据，不需要检查 state
      return {
        organizations: response.organizations || [],
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

/**
 * 获取单个组织详情的 Hook
 */
export function useOrganization(id: number) {
  return useQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: () => OrganizationService.getOrganizationById(id),
    enabled: !!id, // 只有当 id 存在时才执行查询
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
    enabled: options?.enabled !== undefined ? (options.enabled && !!id) : !!id,
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
    onMutate: () => {
      // 显示创建开始的提示
      toast.loading('正在创建组织...', { id: 'create-organization' })
    },
    onSuccess: () => {
      // 关闭加载提示
      toast.dismiss('create-organization')
      
      // 刷新所有组织相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      
      // 显示成功提示
      toast.success('创建成功')
    },
    onError: (error: any) => {
      // 关闭加载提示
      toast.dismiss('create-organization')
      
      console.error('创建组织失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('创建组织失败，请查看控制台日志')
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
    onSuccess: ({ id }) => {
      // 关闭加载提示
      toast.dismiss(`update-${id}`)
      
      // 刷新所有组织相关查询（通配符匹配）
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      
      // 显示成功提示
      toast.success('更新成功')
    },
    onError: (error: any, { id }) => {
      // 关闭加载提示
      toast.dismiss(`update-${id}`)
      
      console.error('更新组织失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      // 前端自己构造错误提示
      toast.error('更新组织失败，请查看控制台日志')
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
      await queryClient.cancelQueries({ queryKey: ['organizations'] })

      // 获取当前数据作为备份
      const previousData = queryClient.getQueriesData({ queryKey: ['organizations'] })

      // 乐观更新：从所有列表查询中移除该组织
      queryClient.setQueriesData(
        { queryKey: ['organizations'] },
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
      
      // 显示成功提示
      toast.success('删除成功')
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
      toast.error('删除组织失败，请查看控制台日志')
    },
    onSettled: () => {
      // 无论成功失败都刷新数据
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      // 刷新域名查询，因为删除组织会解除域名的关联关系，需要更新域名的 organizations 字段
      queryClient.invalidateQueries({ queryKey: ['domains'] })
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
      await queryClient.cancelQueries({ queryKey: ['organizations'] })

      // 获取当前数据作为备份
      const previousData = queryClient.getQueriesData({ queryKey: ['organizations'] })

      // 乐观更新：从所有列表查询中移除这些组织
      queryClient.setQueriesData(
        { queryKey: ['organizations'] },
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
      
      // 打印后端响应
      console.log('批量删除组织成功')
      console.log('后端响应:', response)
      
      // 显示删除成功信息
      const { deletedOrganizationCount } = response
      toast.success(`成功删除 ${deletedOrganizationCount} 个组织`)
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
      toast.error('批量删除失败，请查看控制台日志')
    },
    onSettled: () => {
      // 无论成功失败都刷新数据
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      // 刷新域名查询，因为删除组织会解除域名的关联关系，需要更新域名的 organizations 字段
      queryClient.invalidateQueries({ queryKey: ['domains'] })
    },
  })
}

/**
 * 关联域名到组织的 Mutation Hook（单个）
 */
export function useLinkDomainToOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { organizationId: number; domainId: number }) => 
      OrganizationService.linkDomainToOrganization(data),
    onMutate: ({ organizationId, domainId }) => {
      toast.loading('正在关联域名...', { id: `link-${organizationId}-${domainId}` })
    },
    onSuccess: (response, { organizationId, domainId }) => {
      toast.dismiss(`link-${organizationId}-${domainId}`)
      
      console.log('关联域名成功')
      console.log('后端响应:', response)
      
      toast.success('域名已成功关联')
      
      // 刷新所有域名和组织相关查询
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any, { organizationId, domainId }) => {
      toast.dismiss(`link-${organizationId}-${domainId}`)
      
      console.error('关联域名失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      toast.error('关联域名失败，请查看控制台日志')
    },
  })
}

/**
 * 批量关联域名到组织的 Mutation Hook
 */
export function useBatchLinkDomainsToOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { organizationId: number; domainIds: number[] }) => 
      OrganizationService.batchLinkDomainsToOrganization(data),
    onMutate: ({ organizationId, domainIds }) => {
      toast.loading(`正在关联 ${domainIds.length} 个域名...`, { id: 'batch-link' })
    },
    onSuccess: (response, { organizationId, domainIds }) => {
      toast.dismiss('batch-link')
      
      console.log('批量关联域名成功')
      console.log('后端响应:', response)
      
      const { successCount, failedCount } = response
      if (failedCount > 0) {
        toast.success(`成功关联 ${successCount} 个域名，${failedCount} 个失败`)
      } else {
        toast.success(`成功关联 ${successCount} 个域名`)
      }
      
      // 刷新所有域名和组织相关查询
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
    onError: (error: any, { organizationId, domainIds }) => {
      toast.dismiss('batch-link')
      
      console.error('批量关联域名失败:', error)
      console.error('后端响应:', error?.response?.data || error)
      
      toast.error('批量关联域名失败，请查看控制台日志')
    },
  })
}
