/**
 * MSW Handlers - 子域名相关 API
 */

import { http, HttpResponse } from "msw"
import { mockDomains, getNextDomainId } from "../data/domains"

const BASE_URL = "/api"  // 相对路径，MSW 会自动匹配

export const domainHandlers = [
  // 获取所有子域名
  http.get(`${BASE_URL}/domains/`, () => {
    return HttpResponse.json({
      domains: mockDomains,
      total: mockDomains.length,
      page: 1,
      pageSize: 10,
      totalPages: Math.ceil(mockDomains.length / 10),
    })
  }),

  // 获取单个子域名
  http.get(`${BASE_URL}/domains/:id/`, ({ params }) => {
    const id = parseInt(params.id as string)
    const domain = mockDomains.find((d) => d.id === id)

    if (!domain) {
      return HttpResponse.json({ detail: "未找到子域名" }, { status: 404 })
    }

    return HttpResponse.json(domain)
  }),

  // 批量创建子域名
  http.post(`${BASE_URL}/domains/create/`, async ({ request }) => {
    const body = (await request.json()) as { domains: Array<{ name: string; description?: string; assetId: number }> }
    
    const created = body.domains.map((domain) => ({
      id: getNextDomainId(),
      name: domain.name,
      description: domain.description || "",
      assetId: domain.assetId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    mockDomains.push(...created as any)

    return HttpResponse.json({
      success: created.length,
      failed: 0,
      results: created,
    })
  }),

  // 更新子域名
  http.patch(`${BASE_URL}/domains/:id/`, async ({ params, request }) => {
    const id = parseInt(params.id as string)
    const body = (await request.json()) as any
    const domainIndex = mockDomains.findIndex((d) => d.id === id)

    if (domainIndex === -1) {
      return HttpResponse.json({ detail: "未找到子域名" }, { status: 404 })
    }

    mockDomains[domainIndex] = {
      ...mockDomains[domainIndex],
      ...body,
      updatedAt: new Date().toISOString(),
    }

    return HttpResponse.json(mockDomains[domainIndex])
  }),

  // 删除子域名
  http.delete(`${BASE_URL}/domains/:id/`, ({ params }) => {
    const id = parseInt(params.id as string)
    const domainIndex = mockDomains.findIndex((d) => d.id === id)

    if (domainIndex === -1) {
      return HttpResponse.json({ detail: "未找到子域名" }, { status: 404 })
    }

    mockDomains.splice(domainIndex, 1)
    return HttpResponse.json({ success: true }, { status: 204 })
  }),

  // 获取域名的端点列表
  http.get(`${BASE_URL}/domains/:id/endpoints/`, async ({ params, request }) => {
    const domainId = parseInt(params.id as string)
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get("page") || "1")
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10")

    // 导入 endpoints 数据
    const { mockEndpoints } = await import("../data/endpoints")
    
    const domainEndpoints = mockEndpoints.filter((e) => e.domainId === domainId)
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedEndpoints = domainEndpoints.slice(start, end)

    return HttpResponse.json({
      endpoints: paginatedEndpoints,
      total: domainEndpoints.length,
      page,
      pageSize,
      totalPages: Math.ceil(domainEndpoints.length / pageSize),
    })
  }),
]
