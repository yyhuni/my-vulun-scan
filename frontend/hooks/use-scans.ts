import { useQuery } from '@tanstack/react-query'
import { getScans } from '@/services/scan.service'
import type { GetScansParams } from '@/types/scan.types'

export function useScans(params: GetScansParams = { page: 1, pageSize: 10 }) {
  return useQuery({
    queryKey: ['scans', params],
    queryFn: () => getScans(params),
  })
}

export function useRunningScans(page = 1, pageSize = 10) {
  return useScans({ page, pageSize, status: 'running' })
}
