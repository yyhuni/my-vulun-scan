import { http, HttpResponse } from 'msw'
import type { GetScheduledScansResponse, ScheduledScan } from '@/types/scheduled-scan.types'

const BASE_URL = '/api'

function genScheduled(): ScheduledScan[] {
  const arr: ScheduledScan[] = []
  for (let i = 1; i <= 18; i++) {
    arr.push({
      id: i,
      name: `定时任务-${i}`,
      description: `演示定时任务 ${i}`,
      strategy_id: (i % 3) + 1,
      strategy_name: i % 2 === 0 ? '快速扫描' : '全量扫描',
      frequency: (['once', 'daily', 'weekly', 'monthly'] as const)[i % 4],
      cron_expression: i % 4 === 0 ? '0 0 * * *' : undefined,
      target_domains: [
        `demo${i}.example.com`,
        ...(i % 3 === 0 ? [`api${i}.example.com`] : []),
      ],
      is_enabled: i % 5 !== 0,
      next_run_time: new Date(Date.now() + i * 3600_000).toISOString(),
      last_run_time: new Date(Date.now() - i * 7200_000).toISOString(),
      run_count: Math.floor(i * 1.5),
      created_at: new Date(Date.now() - i * 86400_000).toISOString(),
      updated_at: new Date(Date.now() - i * 3600_000).toISOString(),
      created_by: 'demo',
    })
  }
  return arr
}

export const scheduledScanHandlers = [
  http.get(`${BASE_URL}/scheduled-scans/`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('pageSize')) || 10

    const data = genScheduled()
    const total = data.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    const end = start + pageSize

    const response: GetScheduledScansResponse = {
      scheduled_scans: data.slice(start, end),
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    }

    return HttpResponse.json(response)
  }),
]
