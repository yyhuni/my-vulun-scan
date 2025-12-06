import { api } from '@/lib/api-client'
import type { DashboardStats, AssetStatistics } from '@/types/dashboard.types'

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<DashboardStats>('/dashboard/stats/')
  return res.data
}

/**
 * 获取资产统计数据（预聚合）
 */
export async function getAssetStatistics(): Promise<AssetStatistics> {
  const res = await api.get<AssetStatistics>('/assets/statistics/')
  return res.data
}
