/**
 * MSW Handlers - 资产相关 API
 */

import { http, HttpResponse } from "msw"
import { mockAssets, getNextAssetId } from "../data/assets"

const BASE_URL = "/api"  // 相对路径，MSW 会自动匹配

export const assetHandlers = [
  // 获取所有资产
  http.get(`${BASE_URL}/assets/`, () => {
    return HttpResponse.json({
      assets: mockAssets,
      total: mockAssets.length,
      page: 1,
      pageSize: 10,
      totalPages: Math.ceil(mockAssets.length / 10),
    })
  }),

  // 获取单个资产
  http.get(`${BASE_URL}/assets/:id/`, ({ params }) => {
    const id = parseInt(params.id as string)
    const asset = mockAssets.find((a) => a.id === id)

    if (!asset) {
      return HttpResponse.json({ detail: "未找到资产" }, { status: 404 })
    }

    return HttpResponse.json(asset)
  }),

  // 批量创建资产
  http.post(`${BASE_URL}/assets/create/`, async ({ request }) => {
    const body = (await request.json()) as { assets: Array<{ name: string; description?: string }> }
    
    const created = body.assets.map((asset) => ({
      id: getNextAssetId(),
      name: asset.name,
      description: asset.description || "",
      organizationId: 1, // Mock 默认组织ID
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    mockAssets.push(...created)

    return HttpResponse.json({
      success: created.length,
      failed: 0,
      results: created,
    })
  }),

  // 更新资产
  http.patch(`${BASE_URL}/assets/:id/`, async ({ params, request }) => {
    const id = parseInt(params.id as string)
    const body = (await request.json()) as any
    const assetIndex = mockAssets.findIndex((a) => a.id === id)

    if (assetIndex === -1) {
      return HttpResponse.json({ detail: "未找到资产" }, { status: 404 })
    }

    mockAssets[assetIndex] = {
      ...mockAssets[assetIndex],
      ...body,
      updatedAt: new Date().toISOString(),
    }

    return HttpResponse.json(mockAssets[assetIndex])
  }),

  // 删除资产
  http.delete(`${BASE_URL}/assets/:id/`, ({ params }) => {
    const id = parseInt(params.id as string)
    const assetIndex = mockAssets.findIndex((a) => a.id === id)

    if (assetIndex === -1) {
      return HttpResponse.json({ detail: "未找到资产" }, { status: 404 })
    }

    mockAssets.splice(assetIndex, 1)
    return HttpResponse.json({ success: true }, { status: 204 })
  }),

  // 批量删除资产
  http.post(`${BASE_URL}/assets/batch-delete/`, async ({ request }) => {
    const body = (await request.json()) as { ids: number[] }
    const deletedIds = body.ids.filter((id) => {
      const index = mockAssets.findIndex((a) => a.id === id)
      if (index !== -1) {
        mockAssets.splice(index, 1)
        return true
      }
      return false
    })

    return HttpResponse.json({
      deleted: deletedIds.length,
      failed: body.ids.length - deletedIds.length,
    })
  }),

  // 获取资产的域名列表
  http.get(`${BASE_URL}/assets/:id/domains/`, async ({ params, request }) => {
    const assetId = parseInt(params.id as string)
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get("page") || "1")
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10")

    // 导入 domains 数据
    const { mockDomains } = await import("../data/domains")
    
    const assetDomains = mockDomains.filter((d) => d.assetId === assetId)
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedDomains = assetDomains.slice(start, end)

    return HttpResponse.json({
      domains: paginatedDomains,
      total: assetDomains.length,
      page,
      pageSize,
      totalPages: Math.ceil(assetDomains.length / pageSize),
    })
  }),

  // 获取资产的端点列表
  http.get(`${BASE_URL}/assets/:id/endpoints/`, async ({ params, request }) => {
    const assetId = parseInt(params.id as string)
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get("page") || "1")
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10")

    // 导入 domains 和 endpoints 数据
    const { mockDomains } = await import("../data/domains")
    const { mockEndpoints } = await import("../data/endpoints")
    
    // 找到该资产的所有域名 ID
    const assetDomainIds = mockDomains
      .filter((d) => d.assetId === assetId)
      .map((d) => d.id)
    
    // 找到这些域名下的所有端点
    const assetEndpoints = mockEndpoints.filter((e) => 
      assetDomainIds.includes(e.domainId)
    )
    
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedEndpoints = assetEndpoints.slice(start, end)

    return HttpResponse.json({
      endpoints: paginatedEndpoints,
      total: assetEndpoints.length,
      page,
      pageSize,
      totalPages: Math.ceil(assetEndpoints.length / pageSize),
    })
  }),
]
