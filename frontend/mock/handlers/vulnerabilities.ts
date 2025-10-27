/**
 * Mock Handlers - Vulnerabilities API
 */
import { http, HttpResponse } from 'msw'
import { mockVulnerabilities, getVulnerabilitiesByTargetId } from '../fixtures/vulnerabilities'
import type { GetVulnerabilitiesResponse } from '@/types/vulnerability.types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api'

/**
 * Vulnerabilities API Mock Handlers
 */
export const vulnerabilityHandlers = [
  // GET /api/assets/targets/:targetId/vulnerabilities - 获取目标的漏洞列表
  http.get(`${API_BASE_URL}/assets/targets/:targetId/vulnerabilities`, ({ params, request }) => {
    const targetId = Number(params.targetId)
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('page_size')) || 10

    // 获取目标的所有漏洞
    const targetVulnerabilities = getVulnerabilitiesByTargetId(targetId)

    // 计算分页
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedVulnerabilities = targetVulnerabilities.slice(start, end)
    const total = targetVulnerabilities.length
    const totalPages = Math.ceil(total / pageSize)

    const response: GetVulnerabilitiesResponse = {
      vulnerabilities: paginatedVulnerabilities,
      total,
      page,
      pageSize,
      totalPages,
    }

    return HttpResponse.json(response)
  }),

  // GET /api/vulnerabilities/:id - 获取单个漏洞详情
  http.get(`${API_BASE_URL}/vulnerabilities/:id`, ({ params }) => {
    const id = Number(params.id)
    const vulnerability = mockVulnerabilities.find(v => v.id === id)

    if (!vulnerability) {
      return new HttpResponse(null, { status: 404 })
    }

    return HttpResponse.json(vulnerability)
  }),

  // DELETE /api/vulnerabilities/:id - 删除漏洞
  http.delete(`${API_BASE_URL}/vulnerabilities/:id`, ({ params }) => {
    const id = Number(params.id)
    const index = mockVulnerabilities.findIndex(v => v.id === id)

    if (index === -1) {
      return new HttpResponse(null, { status: 404 })
    }

    // 模拟删除（实际不修改 mock 数据）
    return new HttpResponse(null, { status: 204 })
  }),

  // POST /api/vulnerabilities/batch-delete - 批量删除漏洞
  http.post(`${API_BASE_URL}/vulnerabilities/batch-delete`, async ({ request }) => {
    const body = await request.json() as { ids: number[] }
    const { ids } = body

    if (!ids || !Array.isArray(ids)) {
      return HttpResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // 模拟批量删除
    return HttpResponse.json({
      success: true,
      deleted: ids.length,
    })
  }),
]

