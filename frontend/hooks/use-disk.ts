import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteAllScanResults, deleteAllScreenshots, getDiskStats } from '@/services/disk.service'
import { toast } from 'sonner'

export function useDiskStats() {
  return useQuery({
    queryKey: ['system', 'disk', 'stats'],
    queryFn: () => getDiskStats(),
  })
}

export function useDeleteAllScanResults() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleteAllScanResults(),
    onSuccess: (res) => {
      toast.success(res?.message || '已删除所有扫描结果')
      queryClient.invalidateQueries({ queryKey: ['system', 'disk', 'stats'] })
    },
    onError: () => {
      toast.error('删除扫描结果失败')
    },
  })
}

export function useDeleteAllScreenshots() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleteAllScreenshots(),
    onSuccess: (res) => {
      toast.success(res?.message || '已删除所有截图')
      queryClient.invalidateQueries({ queryKey: ['system', 'disk', 'stats'] })
    },
    onError: () => {
      toast.error('删除截图失败')
    },
  })
}
