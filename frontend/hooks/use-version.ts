import { useQuery } from '@tanstack/react-query'
import { VersionService } from '@/services/version.service'

export function useVersion() {
  return useQuery({
    queryKey: ['version'],
    queryFn: () => VersionService.getVersion(),
    staleTime: Infinity,
  })
}

export function useCheckUpdate() {
  return useQuery({
    queryKey: ['check-update'],
    queryFn: () => VersionService.checkUpdate(),
    enabled: false, // 手动触发
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
  })
}
