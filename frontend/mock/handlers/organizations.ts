/**
 * Mock Handlers - 组织相关 API
 */
import { http, HttpResponse } from 'msw'
import {
  getPaginatedOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  batchDeleteOrganizations,
} from '../fixtures/organizations'
import { getAssetsByOrganizationId } from '../fixtures/assets'
import { getDomainsByOrganizationId } from '../fixtures/domains'

const BASE_URL = '/api'

export const organizationHandlers = [
  // 获取组织列表
  http.get(`${BASE_URL}/organizations/`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('pageSize')) || 10

    const data = getPaginatedOrganizations(page, pageSize)
    
    return HttpResponse.json(data, { status: 200 })
  }),

  // 获取单个组织详情
  http.get(`${BASE_URL}/organizations/:id/`, ({ params }) => {
    const id = Number(params.id)
    const organization = getOrganizationById(id)

    if (!organization) {
      return HttpResponse.json(
        { message: '组织不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json(organization, { status: 200 })
  }),

  // 创建组织
  http.post(`${BASE_URL}/organizations/`, async ({ request }) => {
    const body = await request.json() as { name: string; description: string }
    
    if (!body.name) {
      return HttpResponse.json(
        { message: '组织名称不能为空' },
        { status: 400 }
      )
    }

    const newOrganization = createOrganization(body)
    return HttpResponse.json(newOrganization, { status: 201 })
  }),

  // 更新组织
  http.put(`${BASE_URL}/organizations/:id/`, async ({ params, request }) => {
    const id = Number(params.id)
    const body = await request.json() as { name: string; description: string }

    const updatedOrganization = updateOrganization(id, body)

    if (!updatedOrganization) {
      return HttpResponse.json(
        { message: '组织不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json(updatedOrganization, { status: 200 })
  }),

  // 删除组织
  http.delete(`${BASE_URL}/organizations/:id/`, ({ params }) => {
    const id = Number(params.id)
    const success = deleteOrganization(id)

    if (!success) {
      return HttpResponse.json(
        { message: '组织不存在' },
        { status: 404 }
      )
    }

    return new HttpResponse(null, { status: 204 })
  }),

  // 批量删除组织
  http.post(`${BASE_URL}/organizations/batch_delete/`, async ({ request }) => {
    const body = await request.json() as { organizationIds: number[] }
    const deletedCount = batchDeleteOrganizations(body.organizationIds)

    return HttpResponse.json({
      message: `成功删除 ${deletedCount} 个组织`,
      deletedOrganizationCount: deletedCount,
    }, { status: 200 })
  }),

  // 获取组织的资产列表
  http.get(`${BASE_URL}/organizations/:id/assets/`, ({ params, request }) => {
    const id = Number(params.id)
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('pageSize')) || 10

    const data = getAssetsByOrganizationId(id, page, pageSize)
    return HttpResponse.json(data, { status: 200 })
  }),

  // 获取组织的域名列表
  http.get(`${BASE_URL}/organizations/:id/domains/`, ({ params, request }) => {
    const id = Number(params.id)
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('pageSize')) || 10

    const data = getDomainsByOrganizationId(id, page, pageSize)
    return HttpResponse.json(data, { status: 200 })
  }),

  // 关联资产到组织
  http.post(`${BASE_URL}/organizations/:id/assets/`, async ({ params, request }) => {
    const organizationId = Number(params.id)
    const body = await request.json() as { assetId: number }

    return HttpResponse.json({
      message: `成功将资产 ${body.assetId} 关联到组织 ${organizationId}`,
    }, { status: 200 })
  }),

  // 从组织中移除资产
  http.post(`${BASE_URL}/organizations/:id/assets/unlink/`, async ({ params, request }) => {
    const organizationId = Number(params.id)
    const body = await request.json() as { assetId: number }

    return HttpResponse.json({
      message: `成功从组织 ${organizationId} 中移除资产 ${body.assetId}`,
    }, { status: 200 })
  }),

  // 关联域名到组织
  http.post(`${BASE_URL}/organizations/:id/domains/`, async ({ params, request }) => {
    const organizationId = Number(params.id)
    const body = await request.json() as { domainId: number }

    return HttpResponse.json({
      message: `成功将域名 ${body.domainId} 关联到组织 ${organizationId}`,
    }, { status: 200 })
  }),

  // 从组织中移除域名
  http.post(`${BASE_URL}/organizations/:id/domains/remove/`, async ({ params, request }) => {
    const organizationId = Number(params.id)
    const body = await request.json() as { domainId: number }

    return HttpResponse.json({
      message: `成功从组织 ${organizationId} 中移除域名 ${body.domainId}`,
    }, { status: 200 })
  }),

  // 批量从组织中移除资产
  http.post(`${BASE_URL}/organizations/:id/assets/batch-remove/`, async ({ params, request }) => {
    const organizationId = Number(params.id)
    const body = await request.json() as { assetIds: number[] }

    return HttpResponse.json({
      message: `成功从组织 ${organizationId} 中移除 ${body.assetIds.length} 个资产`,
      successCount: body.assetIds.length,
      failedCount: 0,
    }, { status: 200 })
  }),
]

