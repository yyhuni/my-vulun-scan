import { useQuery } from '@tanstack/react-query'
import { getDashboardStats, getAssetStatistics } from '@/services/dashboard.service'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => getDashboardStats(),
  })
}

/**
 * 获取资产统计数据（预聚合）
 */
export function useAssetStatistics() {
  return useQuery({
    queryKey: ['asset', 'statistics'],
    queryFn: getAssetStatistics,
  })
}
