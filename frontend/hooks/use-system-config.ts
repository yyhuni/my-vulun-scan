/**
 * 系统配置 Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { systemConfigService } from '@/services/system-config.service'
import type { UpdateSystemConfigRequest } from '@/types/system-config.types'
import type { SystemConfigResponse } from '@/types/system-config.types'
import { toast } from 'sonner'

// Query Keys
export const systemConfigKeys = {
  all: ['systemConfig'] as const,
  config: () => [...systemConfigKeys.all, 'config'] as const,
}

/**
 * 获取系统配置
 */
export function useSystemConfig() {
  return useQuery({
    queryKey: systemConfigKeys.config(),
    queryFn: () => systemConfigService.getConfig(),
  })
}

/**
 * 更新系统配置
 */
export function useUpdateSystemConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateSystemConfigRequest) => systemConfigService.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: systemConfigKeys.config() })
      toast.success('系统配置已保存')
    },
    onError: (error: Error) => {
      toast.error(`保存失败: ${error.message}`)
    },
  })
}
