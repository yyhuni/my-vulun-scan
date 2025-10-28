import { useQuery } from '@tanstack/react-query'
import { getDashboardStats, getSystemMetrics } from '@/services/dashboard.service'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => getDashboardStats(),
  })
}

export function useSystemMetrics(range: '1h' | '24h' | '7d' = '24h') {
  return useQuery({
    queryKey: ['system', 'metrics', range],
    queryFn: () => getSystemMetrics({ range }),
  })
}
