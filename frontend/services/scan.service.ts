import { api } from '@/lib/api-client'
import type { 
  GetScansParams, 
  GetScansResponse,
  InitiateScanRequest,
  InitiateScanResponse
} from '@/types/scan.types'

/**
 * 获取扫描列表
 */
export async function getScans(params?: GetScansParams): Promise<GetScansResponse> {
  const res = await api.get<GetScansResponse>('/scans/', { params })
  return res.data
}

/**
 * 发起扫描任务
 * @param data - 扫描请求参数
 * @returns 扫描任务信息
 */
export async function initiateScan(data: InitiateScanRequest): Promise<InitiateScanResponse> {
  const res = await api.post<InitiateScanResponse>('/scans/initiate/', data)
  return res.data
}
