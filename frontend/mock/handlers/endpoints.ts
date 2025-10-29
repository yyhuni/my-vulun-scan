/**
 * Mock Handlers - 端点相关 API
 */
import { http, HttpResponse } from 'msw'
import { mockEndpoints } from '../fixtures/endpoints'
import type { Endpoint, CreateEndpointRequest } from '@/types/endpoint.types'

const BASE_URL = '/api'

export const endpointHandlers = [
  // 获取端点列表
  http.get(`${BASE_URL}/endpoints/`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('page_size')) || 10
    const domainId = url.searchParams.get('domain_id')

    let filtered = mockEndpoints
    if (domainId) {
      filtered = mockEndpoints.filter(e => e.domainId === Number(domainId))
    }

    const totalCount = filtered.length
    const totalPages = Math.ceil(totalCount / pageSize)
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const endpoints = filtered.slice(startIndex, endIndex)

    return HttpResponse.json({
      endpoints,
      page,
      pageSize,
      total: totalCount,
      totalPages,
    }, { status: 200 })
  }),

  // 获取单个端点详情
  http.get(`${BASE_URL}/endpoints/:id/`, ({ params }) => {
    const id = Number(params.id)
    const endpoint = mockEndpoints.find(e => e.id === id)

    if (!endpoint) {
      return HttpResponse.json(
        { message: '端点不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json(endpoint, { status: 200 })
  }),

  // 根据域名ID获取端点列表
  http.get(`${BASE_URL}/domains/:domainId/endpoints/`, ({ request, params }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('page_size')) || 10
    const domainId = Number(params.domainId)

    const filtered = mockEndpoints.filter(e => e.domainId === domainId)
    const totalCount = filtered.length
    const totalPages = Math.ceil(totalCount / pageSize)
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const endpoints = filtered.slice(startIndex, endIndex)

    return HttpResponse.json({
      endpoints,
      page,
      pageSize,
      total: totalCount,
      totalPages,
    }, { status: 200 })
  }),

  // 批量创建端点
  http.post(`${BASE_URL}/endpoints/create/`, async ({ request }) => {
    const body = await request.json() as { endpoints: Array<CreateEndpointRequest> }
    
    if (!body.endpoints || body.endpoints.length === 0) {
      return HttpResponse.json(
        { message: '端点数据不能为空' },
        { status: 400 }
      )
    }

    const createdCount = body.endpoints.length
    const existedCount = 0

    return HttpResponse.json({
      message: '端点创建成功',
      createdCount,
      existedCount,
    }, { status: 201 })
  }),

  // 删除单个端点
  http.delete(`${BASE_URL}/endpoints/:id/`, ({ params }) => {
    const id = Number(params.id)
    const endpoint = mockEndpoints.find(e => e.id === id)

    if (!endpoint) {
      return HttpResponse.json(
        { message: '端点不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json(
      { message: '删除成功' },
      { status: 200 }
    )
  }),

  // 批量删除端点
  http.post(`${BASE_URL}/endpoints/batch-delete/`, async ({ request }) => {
    const body = await request.json() as { endpoint_ids: number[] }
    
    if (!body.endpoint_ids || body.endpoint_ids.length === 0) {
      return HttpResponse.json(
        { message: '端点ID列表不能为空' },
        { status: 400 }
      )
    }

    const deletedCount = body.endpoint_ids.length

    return HttpResponse.json({
      message: '批量删除成功',
      deletedCount,
    }, { status: 200 })
  }),
]
