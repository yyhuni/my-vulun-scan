/**
 * MSW Handlers - 组织相关 API
 */

import { http, HttpResponse } from "msw"
import { mockOrganizations, getNextOrgId } from "../data/organizations"
import { mockAssets } from "../data/assets"

const BASE_URL = "/api"  // 相对路径，MSW 会自动匹配

export const organizationHandlers = [
  // 获取所有组织
  http.get(`${BASE_URL}/organizations/`, () => {
    return HttpResponse.json({
      organizations: mockOrganizations,
      total: mockOrganizations.length,
      page: 1,
      pageSize: 10,
      totalPages: Math.ceil(mockOrganizations.length / 10),
    })
  }),

  // 获取单个组织
  http.get(`${BASE_URL}/organizations/:id/`, ({ params }) => {
    const id = parseInt(params.id as string)
    const org = mockOrganizations.find((o) => o.id === id)

    if (!org) {
      return HttpResponse.json({ detail: "未找到组织" }, { status: 404 })
    }

    return HttpResponse.json(org)
  }),

  // 创建组织
  http.post(`${BASE_URL}/organizations/`, async ({ request }) => {
    const body = (await request.json()) as any
    const newOrg = {
      id: getNextOrgId(),
      name: body.name,
      description: body.description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mockOrganizations.push(newOrg)
    return HttpResponse.json(newOrg, { status: 201 })
  }),

  // 更新组织
  http.patch(`${BASE_URL}/organizations/:id/`, async ({ params, request }) => {
    const id = parseInt(params.id as string)
    const body = (await request.json()) as any
    const orgIndex = mockOrganizations.findIndex((o) => o.id === id)

    if (orgIndex === -1) {
      return HttpResponse.json({ detail: "未找到组织" }, { status: 404 })
    }

    mockOrganizations[orgIndex] = {
      ...mockOrganizations[orgIndex],
      ...body,
      updatedAt: new Date().toISOString(),
    }

    return HttpResponse.json(mockOrganizations[orgIndex])
  }),

  // 删除组织
  http.delete(`${BASE_URL}/organizations/:id/`, ({ params }) => {
    const id = parseInt(params.id as string)
    const orgIndex = mockOrganizations.findIndex((o) => o.id === id)

    if (orgIndex === -1) {
      return HttpResponse.json({ detail: "未找到组织" }, { status: 404 })
    }

    mockOrganizations.splice(orgIndex, 1)
    return HttpResponse.json({ success: true }, { status: 204 })
  }),

  // 批量删除组织
  http.post(`${BASE_URL}/organizations/batch-delete/`, async ({ request }) => {
    const body = (await request.json()) as { ids: number[] }
    const deletedIds = body.ids.filter((id) => {
      const index = mockOrganizations.findIndex((o) => o.id === id)
      if (index !== -1) {
        mockOrganizations.splice(index, 1)
        return true
      }
      return false
    })

    return HttpResponse.json({
      deleted: deletedIds.length,
      failed: body.ids.length - deletedIds.length,
    })
  }),

  // 获取组织的资产列表（分页）
  http.get(`${BASE_URL}/organizations/:id/assets/`, ({ params, request }) => {
    const id = parseInt(params.id as string)
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get("page") || "1")
    const pageSize = parseInt(url.searchParams.get("pageSize") || url.searchParams.get("page_size") || "10")

    const orgAssets = mockAssets.filter((a: any) => a.organizationId === id)
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedAssets = orgAssets.slice(start, end)

    return HttpResponse.json({
      assets: paginatedAssets,
      total: orgAssets.length,
      page,
      pageSize,
      totalPages: Math.ceil(orgAssets.length / pageSize),
    })
  }),

  // 关联资产到组织
  http.post(`${BASE_URL}/organizations/:id/assets/`, async ({ params, request }) => {
    const orgId = parseInt(params.id as string)
    const body = (await request.json()) as { assetId: number }

    return HttpResponse.json({
      success: true,
      message: "资产关联成功",
    })
  }),

  // 从组织移除资产
  http.post(`${BASE_URL}/organizations/:id/assets/remove/`, async ({ params, request }) => {
    const body = (await request.json()) as { assetId: number }

    return HttpResponse.json({
      success: true,
      message: "资产已移除",
    })
  }),

  // 获取组织的域名列表（分页）
  http.get(`${BASE_URL}/organizations/:id/domains/`, async ({ params, request }) => {
    const id = parseInt(params.id as string)
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get("page") || "1")
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10")

    // 导入 domains 数据
    const { mockDomains } = await import("../data/domains")
    
    // 先找到该组织的所有资产
    const orgAssets = mockAssets.filter((a: any) => a.organizationId === id)
    const orgAssetIds = orgAssets.map((a: any) => a.id)
    
    // 找到这些资产下的所有域名
    const orgDomains = mockDomains.filter((d) => orgAssetIds.includes(d.assetId))
    
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedDomains = orgDomains.slice(start, end)

    return HttpResponse.json({
      domains: paginatedDomains,
      total: orgDomains.length,
      page,
      pageSize,
      totalPages: Math.ceil(orgDomains.length / pageSize),
    })
  }),

  // 关联域名到组织
  http.post(`${BASE_URL}/organizations/:id/domains/`, async ({ params, request }) => {
    const orgId = parseInt(params.id as string)
    const body = (await request.json()) as { domainId: number }

    return HttpResponse.json({
      success: true,
      message: "域名关联成功",
    })
  }),

  // 从组织移除域名
  http.post(`${BASE_URL}/organizations/:id/domains/remove/`, async ({ params, request }) => {
    const body = (await request.json()) as { domainId: number }

    return HttpResponse.json({
      success: true,
      message: "域名已移除",
    })
  }),
]
