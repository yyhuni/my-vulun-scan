import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { 
  getScans, 
  getScan, 
  getScanStatistics,
  quickScan,
  initiateScan,
  deleteScan,
  bulkDeleteScans,
  stopScan
} from '@/services/scan.service'
import { useToastMessages } from '@/lib/toast-helpers'
import { parseResponse, getErrorCode } from '@/lib/response-parser'
import type { 
  GetScansParams, 
  QuickScanRequest, 
  InitiateScanRequest 
} from '@/types/scan.types'

export function useScans(params: GetScansParams = { page: 1, pageSize: 10 }) {
  return useQuery({
    queryKey: ['scans', params],
    queryFn: () => getScans(params),
    placeholderData: keepPreviousData,
  })
}

export function useRunningScans(page = 1, pageSize = 10) {
  return useScans({ page, pageSize, status: 'running' })
}

/**
 * 获取目标的扫描历史
 */
export function useTargetScans(targetId: number, pageSize = 5) {
  return useQuery({
    queryKey: ['scans', 'target', targetId, pageSize],
    queryFn: () => getScans({ target: targetId, pageSize }),
    enabled: !!targetId,
  })
}

export function useScan(id: number) {
  return useQuery({
    queryKey: ['scan', id],
    queryFn: () => getScan(id),
    enabled: !!id,
  })
}

/**
 * 获取扫描统计数据
 */
export function useScanStatistics() {
  return useQuery({
    queryKey: ['scan-statistics'],
    queryFn: getScanStatistics,
  })
}

/**
 * 快速扫描 mutation hook
 */
export function useQuickScan() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (data: QuickScanRequest) => quickScan(data),
    onSuccess: (response) => {
      const data = parseResponse<any>(response)
      if (data) {
        // 使用 i18n 消息显示成功提示
        const count = data.scans?.length || data.targetStats?.created || data.count || 0
        toastMessages.success('toast.scan.quick.success', { count })
        // 刷新扫描列表
        queryClient.invalidateQueries({ queryKey: ['scans'] })
        queryClient.invalidateQueries({ queryKey: ['scan-statistics'] })
      }
    },
    onError: (error: any) => {
      const errorCode = getErrorCode(error.response?.data)
      if (errorCode) {
        toastMessages.errorFromCode(errorCode)
      } else {
        toastMessages.error('toast.scan.quick.error')
      }
    },
  })
}

/**
 * 发起扫描 mutation hook
 */
export function useInitiateScan() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (data: InitiateScanRequest) => initiateScan(data),
    onSuccess: (response) => {
      const data = parseResponse<any>(response)
      if (data) {
        // 使用 i18n 消息显示成功提示
        toastMessages.success('toast.scan.initiate.success')
        // 刷新扫描列表
        queryClient.invalidateQueries({ queryKey: ['scans'] })
        queryClient.invalidateQueries({ queryKey: ['scan-statistics'] })
      }
    },
    onError: (error: any) => {
      const errorCode = getErrorCode(error.response?.data)
      if (errorCode) {
        toastMessages.errorFromCode(errorCode)
      } else {
        toastMessages.error('toast.scan.initiate.error')
      }
    },
  })
}

/**
 * 删除扫描 mutation hook
 */
export function useDeleteScan() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (id: number) => deleteScan(id),
    onSuccess: (response, id) => {
      const data = parseResponse<any>(response)
      // 使用 i18n 消息显示成功提示
      toastMessages.success('toast.scan.delete.success', { 
        name: `Scan #${id}` 
      })
      // 刷新扫描列表
      queryClient.invalidateQueries({ queryKey: ['scans'] })
      queryClient.invalidateQueries({ queryKey: ['scan-statistics'] })
    },
    onError: (error: any) => {
      const errorCode = getErrorCode(error.response?.data)
      if (errorCode) {
        toastMessages.errorFromCode(errorCode)
      } else {
        toastMessages.error('toast.deleteFailed')
      }
    },
  })
}

/**
 * 批量删除扫描 mutation hook
 */
export function useBulkDeleteScans() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (ids: number[]) => bulkDeleteScans(ids),
    onSuccess: (response, ids) => {
      const data = parseResponse<any>(response)
      if (data) {
        // 使用 i18n 消息显示成功提示
        const count = data.deletedCount || ids.length || 0
        toastMessages.success('toast.scan.delete.bulkSuccess', { count })
        // 刷新扫描列表
        queryClient.invalidateQueries({ queryKey: ['scans'] })
        queryClient.invalidateQueries({ queryKey: ['scan-statistics'] })
      }
    },
    onError: (error: any) => {
      const errorCode = getErrorCode(error.response?.data)
      if (errorCode) {
        toastMessages.errorFromCode(errorCode)
      } else {
        toastMessages.error('toast.bulkDeleteFailed')
      }
    },
  })
}

/**
 * 停止扫描 mutation hook
 */
export function useStopScan() {
  const queryClient = useQueryClient()
  const toastMessages = useToastMessages()

  return useMutation({
    mutationFn: (id: number) => stopScan(id),
    onSuccess: (response) => {
      const data = parseResponse<any>(response)
      if (data) {
        // 使用 i18n 消息显示成功提示
        const count = data.revokedTaskCount || 1
        toastMessages.success('toast.scan.stop.success', { count })
        // 刷新扫描列表
        queryClient.invalidateQueries({ queryKey: ['scans'] })
        queryClient.invalidateQueries({ queryKey: ['scan-statistics'] })
      }
    },
    onError: (error: any) => {
      const errorCode = getErrorCode(error.response?.data)
      if (errorCode) {
        toastMessages.errorFromCode(errorCode)
      } else {
        toastMessages.error('toast.stopFailed')
      }
    },
  })
}
