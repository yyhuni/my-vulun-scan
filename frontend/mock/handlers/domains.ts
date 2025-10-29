/**
 * Mock Handlers - 域名/子域名相关 API
 */
import { http, HttpResponse } from 'msw'
import { mockDomains, getDomainById } from '../fixtures/domains'
import type { Subdomain } from '@/types/subdomain.types'

const BASE_URL = '/api'

export const domainHandlers = [
  // 获取所有域名列表
  http.get(`${BASE_URL}/domains/`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('page_size')) || 10

    const totalCount = mockDomains.length
    const totalPages = Math.ceil(totalCount / pageSize)
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const domains = mockDomains.slice(startIndex, endIndex)

    return HttpResponse.json({
      domains,
      page,
      pageSize,
      total: totalCount,
      totalPages,
    }, { status: 200 })
  }),

  // 获取单个域名详情
  http.get(`${BASE_URL}/domains/:id/`, ({ params }) => {
    const id = Number(params.id)
    const domain = getDomainById(id)

    if (!domain) {
      return HttpResponse.json(
        { message: '域名不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json(domain, { status: 200 })
  }),

  // 批量创建域名（绑定到资产）
  http.post(`${BASE_URL}/domains/create/`, async ({ request }) => {
    const body = await request.json() as { 
      domains: Array<{ name: string }>
      asset_id: number 
    }
    
    if (!body.domains || body.domains.length === 0) {
      return HttpResponse.json(
        { message: '域名数据不能为空' },
        { status: 400 }
      )
    }

    const createdCount = body.domains.length
    const existedCount = 0
    const skippedCount = 0

    return HttpResponse.json({
      message: '域名创建成功',
      createdCount,
      existedCount,
      skippedCount,
    }, { status: 201 })
  }),

  // 更新域名信息
  http.patch(`${BASE_URL}/domains/:id/`, async ({ params, request }) => {
    const id = Number(params.id)
    const domain = getDomainById(id)

    if (!domain) {
      return HttpResponse.json(
        { message: '域名不存在' },
        { status: 404 }
      )
    }

    const body = await request.json() as Partial<Subdomain>
    const updated = { ...domain, ...body }

    return HttpResponse.json(updated, { status: 200 })
  }),

  // 删除单个域名
  http.delete(`${BASE_URL}/domains/:id/`, ({ params }) => {
    const id = Number(params.id)
    const domain = getDomainById(id)

    if (!domain) {
      return HttpResponse.json(
        { message: '域名不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json(
      { message: '删除成功' },
      { status: 200 }
    )
  }),

  // 批量删除域名
  http.post(`${BASE_URL}/domains/batch-delete/`, async ({ request }) => {
    const body = await request.json() as { domain_ids: number[] }
    
    if (!body.domain_ids || body.domain_ids.length === 0) {
      return HttpResponse.json(
        { message: '域名ID列表不能为空' },
        { status: 400 }
      )
    }

    const deletedDomainCount = body.domain_ids.length
    const deletedSubdomainCount = deletedDomainCount * 2

    return HttpResponse.json({
      message: '批量删除成功',
      deletedDomainCount,
      deletedSubdomainCount,
    }, { status: 200 })
  }),

  // 获取组织的域名列表
  http.get(`${BASE_URL}/organizations/:organizationId/domains/`, ({ request, params }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('page_size')) || 10
    const organizationId = Number(params.organizationId)

    const filtered = mockDomains.filter(d => d.assetId === organizationId)
    const totalCount = filtered.length
    const totalPages = Math.ceil(totalCount / pageSize)
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const domains = filtered.slice(startIndex, endIndex)

    return HttpResponse.json({
      domains,
      page,
      pageSize,
      total: totalCount,
      totalPages,
    }, { status: 200 })
  }),

  // 批量从组织中移除域名
  http.post(`${BASE_URL}/organizations/:organizationId/domains/batch-remove/`, async ({ params, request }) => {
    const organizationId = Number(params.organizationId)
    const body = await request.json() as { domain_ids: number[] }
    
    if (!body.domain_ids || body.domain_ids.length === 0) {
      return HttpResponse.json(
        { message: '域名ID列表不能为空' },
        { status: 400 }
      )
    }

    const successCount = body.domain_ids.length
    const failedCount = 0

    return HttpResponse.json({
      message: '批量移除成功',
      successCount,
      failedCount,
    }, { status: 200 })
  }),
]
