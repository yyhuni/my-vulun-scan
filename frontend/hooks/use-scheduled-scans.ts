import { useQuery } from '@tanstack/react-query'
import { getScheduledScans } from '@/services/scheduled-scan.service'

export function useScheduledScans(params: { page?: number; pageSize?: number } = { page: 1, pageSize: 10 }) {
  return useQuery({
    queryKey: ['scheduled-scans', params],
    queryFn: () => getScheduledScans(params),
  })
}
