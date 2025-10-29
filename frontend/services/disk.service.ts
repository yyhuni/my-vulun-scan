import { api } from '@/lib/api-client'
import type { DiskStats } from '@/types/disk.types'

export async function getDiskStats(): Promise<DiskStats> {
  const res = await api.get<DiskStats>('/system/disk/')
  return res.data
}

export async function deleteAllScanResults(): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>('/system/disk/delete-scan-results/')
  return res.data
}

export async function deleteAllScreenshots(): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>('/system/disk/delete-screenshots/')
  return res.data
}
