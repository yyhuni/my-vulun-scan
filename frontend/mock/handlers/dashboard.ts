import { http, HttpResponse } from 'msw'
import type { DashboardStats, SystemMetricsResponse } from '@/types/dashboard.types'

const BASE_URL = '/api'

export const dashboardHandlers = [
  http.get(`${BASE_URL}/dashboard/stats/`, () => {
    const data: DashboardStats = {
      totalTargets: 42,
      totalSubdomains: 1234,
      totalEndpoints: 5678,
      totalVulnerabilities: 89,
    }
    return HttpResponse.json(data)
  }),

  http.get(`${BASE_URL}/system/metrics/`, ({ request }) => {
    const url = new URL(request.url)
    const range = (url.searchParams.get('range') as '1h' | '24h' | '7d') || '24h'

    const now = Date.now()
    const pointsCount = range === '1h' ? 60 : range === '24h' ? 96 : 84
    const stepMs = range === '1h' ? 60_000 : range === '24h' ? 15 * 60_000 : 2 * 60 * 60_000

    const points = Array.from({ length: pointsCount }).map((_, i) => {
      const t = new Date(now - (pointsCount - 1 - i) * stepMs).toISOString()
      // 简单生成波动数据
      const cpu = Math.max(0, Math.min(100, 40 + 20 * Math.sin(i / 5) + (Math.random() * 10 - 5)))
      const memory = Math.max(0, Math.min(100, 55 + 15 * Math.cos(i / 7) + (Math.random() * 8 - 4)))
      const diskIo = Math.max(0, Math.min(100, 30 + 25 * Math.sin(i / 9) + (Math.random() * 12 - 6)))
      return { timestamp: t, cpu: Number(cpu.toFixed(1)), memory: Number(memory.toFixed(1)), diskIo: Number(diskIo.toFixed(1)) }
    })

    const data: SystemMetricsResponse = { points }
    return HttpResponse.json(data)
  }),
]
