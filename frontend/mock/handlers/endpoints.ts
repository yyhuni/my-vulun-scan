/**
 * MSW Handlers - 端点相关 API
 */

import { http, HttpResponse } from "msw"
import { mockEndpoints, getNextEndpointId } from "../data/endpoints"

const BASE_URL = "/api"  // 相对路径，MSW 会自动匹配

export const endpointHandlers = [
  // 获取所有端点
  http.get(`${BASE_URL}/endpoints/`, () => {
    return HttpResponse.json({
      endpoints: mockEndpoints,
      total: mockEndpoints.length,
      page: 1,
      pageSize: 10,
      totalPages: Math.ceil(mockEndpoints.length / 10),
    })
  }),

  // 获取单个端点
  http.get(`${BASE_URL}/endpoints/:id/`, ({ params }) => {
    const id = parseInt(params.id as string)
    const endpoint = mockEndpoints.find((e) => e.id === id)

    if (!endpoint) {
      return HttpResponse.json({ detail: "未找到端点" }, { status: 404 })
    }

    return HttpResponse.json(endpoint)
  }),

  // 批量创建端点
  http.post(`${BASE_URL}/endpoints/create/`, async ({ request }) => {
    const body = (await request.json()) as { endpoints: Array<{ url: string; domainId: number }> }
    
    const created = body.endpoints.map((endpoint) => ({
      id: getNextEndpointId(),
      url: endpoint.url,
      description: "",
      domainId: endpoint.domainId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    mockEndpoints.push(...created as any)

    return HttpResponse.json({
      success: created.length,
      failed: 0,
      results: created,
    })
  }),

  // 更新端点
  http.patch(`${BASE_URL}/endpoints/:id/`, async ({ params, request }) => {
    const id = parseInt(params.id as string)
    const body = (await request.json()) as any
    const endpointIndex = mockEndpoints.findIndex((e) => e.id === id)

    if (endpointIndex === -1) {
      return HttpResponse.json({ detail: "未找到端点" }, { status: 404 })
    }

    mockEndpoints[endpointIndex] = {
      ...mockEndpoints[endpointIndex],
      ...body,
      updatedAt: new Date().toISOString(),
    }

    return HttpResponse.json(mockEndpoints[endpointIndex])
  }),

  // 删除端点
  http.delete(`${BASE_URL}/endpoints/:id/`, ({ params }) => {
    const id = parseInt(params.id as string)
    const endpointIndex = mockEndpoints.findIndex((e) => e.id === id)

    if (endpointIndex === -1) {
      return HttpResponse.json({ detail: "未找到端点" }, { status: 404 })
    }

    mockEndpoints.splice(endpointIndex, 1)
    return HttpResponse.json({ success: true }, { status: 204 })
  }),
]
