import { api } from '@/lib/api-client'
import type { DashboardStats, SystemMetricsResponse } from '@/types/dashboard.types'

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<DashboardStats>('/dashboard/stats/')
  return res.data
}

export async function getSystemMetrics(params?: { range?: '1h' | '24h' | '7d' }): Promise<SystemMetricsResponse> {
  const res = await api.get<SystemMetricsResponse>('/system/metrics/', { params })
  return res.data
}
