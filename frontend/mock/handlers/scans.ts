import { http, HttpResponse } from 'msw'
import type { GetScansResponse, ScanRecord, ScanStatus } from '@/types/scan.types'

const BASE_URL = '/api'

function genScans(): ScanRecord[] {
  const items: ScanRecord[] = []
  const statuses: ScanStatus[] = ['running', 'completed', 'failed', 'pending']
  for (let i = 1; i <= 25; i++) {
    const status = statuses[i % statuses.length]
    items.push({
      id: i,
      domainName: `demo${i}.example.com`,
      summary: { subdomains: (i * 3) % 30, endpoints: (i * 17) % 500, vulnerabilities: (i * 5) % 20 },
      scanEngine: i % 2 === 0 ? 'Full Scan' : 'Quick Scan',
      lastScan: new Date(Date.now() - i * 3600_000).toISOString(),
      status,
      progress: status === 'completed' ? 100 : status === 'running' ? (i * 7) % 100 : 0,
    })
  }
  return items
}

export const scansHandlers = [
  http.get(`${BASE_URL}/scans/`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('pageSize')) || 10
    const status = url.searchParams.get('status') as ScanStatus | null

    let data = genScans()
    if (status) data = data.filter(s => s.status === status)

    const total = data.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    const end = start + pageSize

    const response: GetScansResponse = {
      scans: data.slice(start, end),
      total,
      page,
      pageSize,
      totalPages,
    }

    return HttpResponse.json(response)
  }),
]
