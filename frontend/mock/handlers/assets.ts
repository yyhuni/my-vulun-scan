/**
 * Mock Handlers - 资产相关 API
 */
import { http, HttpResponse } from 'msw'
import {
  getAllAssets,
  getAssetById,
  getAssetsByOrganizationId,
  createAssets,
  updateAsset,
  deleteAsset,
  batchDeleteAssets,
} from '../fixtures/assets'
import { getDomainsByAssetId } from '../fixtures/domains'
import { getEndpointsByAssetId } from '../fixtures/endpoints'

const BASE_URL = '/api'

export const assetHandlers = [
  // 获取所有资产列表
  http.get(`${BASE_URL}/assets/`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('pageSize')) || 10

    const data = getAllAssets(page, pageSize)
    return HttpResponse.json(data, { status: 200 })
  }),

  // 获取单个资产详情
  http.get(`${BASE_URL}/assets/:id/`, ({ params }) => {
    const id = Number(params.id)
    const asset = getAssetById(id)

    if (!asset) {
      return HttpResponse.json(
        { message: '资产不存在' },
        { status: 404 }
      )
    }

    // 返回资产详情，包含额外信息
    return HttpResponse.json({
      ...asset,
      // 可以添加额外的详细信息
    }, { status: 200 })
  }),

  // 批量创建资产
  http.post(`${BASE_URL}/assets/create/`, async ({ request }) => {
    const body = await request.json() as {
      assets: Array<{ name: string; description?: string }>
      organizationId: number
    }

    if (!body.assets || body.assets.length === 0) {
      return HttpResponse.json(
        { message: '资产列表不能为空' },
        { status: 400 }
      )
    }

    const result = createAssets(body)
    return HttpResponse.json(result, { status: 201 })
  }),

  // 更新资产
  http.patch(`${BASE_URL}/assets/:id/`, async ({ params, request }) => {
    const id = Number(params.id)
    const body = await request.json() as { name?: string; description?: string }

    const updatedAsset = updateAsset(id, body)

    if (!updatedAsset) {
      return HttpResponse.json(
        { message: '资产不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json(updatedAsset, { status: 200 })
  }),

  // 删除单个资产
  http.delete(`${BASE_URL}/assets/:id/`, ({ params }) => {
    const id = Number(params.id)
    const success = deleteAsset(id)

    if (!success) {
      return HttpResponse.json(
        { message: '资产不存在' },
        { status: 404 }
      )
    }

    return new HttpResponse(null, { status: 204 })
  }),

  // 批量删除资产
  http.post(`${BASE_URL}/assets/batch-delete/`, async ({ request }) => {
    const body = await request.json() as { assetIds: number[] }
    const result = batchDeleteAssets(body.assetIds)

    return HttpResponse.json(result, { status: 200 })
  }),

  // 获取资产的域名列表
  http.get(`${BASE_URL}/assets/:id/domains/`, ({ params, request }) => {
    const id = Number(params.id)
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('pageSize')) || 10

    const data = getDomainsByAssetId(id, page, pageSize)
    return HttpResponse.json(data, { status: 200 })
  }),

  // 获取资产的端点列表
  http.get(`${BASE_URL}/assets/:id/endpoints/`, ({ params, request }) => {
    const id = Number(params.id)
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('pageSize')) || 10

    const data = getEndpointsByAssetId(id, page, pageSize)
    return HttpResponse.json(data, { status: 200 })
  }),
]

