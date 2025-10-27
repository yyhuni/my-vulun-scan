/**
 * Mock Handlers - 目标相关 API
 */
import { http, HttpResponse } from 'msw'
import {
  getAllTargets,
  getTargetById,
  createTarget,
  updateTarget,
  deleteTarget,
  batchDeleteTargets,
  getTargetOrganizations,
  linkTargetOrganizations,
  unlinkTargetOrganizations,
} from '../fixtures/targets'

const BASE_URL = '/api'

export const targetHandlers = [
  // 获取所有目标列表
  http.get(`${BASE_URL}/targets/`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('pageSize')) || 10

    const data = getAllTargets(page, pageSize)
    return HttpResponse.json(data, { status: 200 })
  }),

  // 获取单个目标详情
  http.get(`${BASE_URL}/targets/:id/`, ({ params }) => {
    const id = Number(params.id)
    const target = getTargetById(id)

    if (!target) {
      return HttpResponse.json({ message: '目标不存在' }, { status: 404 })
    }

    return HttpResponse.json(target, { status: 200 })
  }),

  // 创建目标
  http.post(`${BASE_URL}/targets/`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string
      type: 'domain' | 'ip' | 'cidr'
      organizationIds: number[]
      description?: string
    }

    if (!body.name || !body.type) {
      return HttpResponse.json({ message: '缺少必填字段' }, { status: 400 })
    }

    const newTarget = createTarget(body)
    return HttpResponse.json(newTarget, { status: 201 })
  }),

  // 更新目标
  http.patch(`${BASE_URL}/targets/:id/`, async ({ params, request }) => {
    const id = Number(params.id)
    const body = (await request.json()) as {
      name?: string
      type?: 'domain' | 'ip' | 'cidr'
      organizationIds?: number[]
      description?: string
    }

    const updatedTarget = updateTarget(id, body)

    if (!updatedTarget) {
      return HttpResponse.json({ message: '目标不存在' }, { status: 404 })
    }

    return HttpResponse.json(updatedTarget, { status: 200 })
  }),

  // 删除单个目标
  http.delete(`${BASE_URL}/targets/:id/`, ({ params }) => {
    const id = Number(params.id)
    const success = deleteTarget(id)

    if (!success) {
      return HttpResponse.json({ message: '目标不存在' }, { status: 404 })
    }

    return new HttpResponse(null, { status: 204 })
  }),

  // 批量删除目标
  http.post(`${BASE_URL}/targets/batch-delete/`, async ({ request }) => {
    const body = (await request.json()) as { targetIds: number[] }

    if (!body.targetIds || body.targetIds.length === 0) {
      return HttpResponse.json({ message: '目标 ID 列表不能为空' }, { status: 400 })
    }

    const result = batchDeleteTargets(body.targetIds)
    return HttpResponse.json(result, { status: 200 })
  }),

  // 获取目标的组织列表
  http.get(`${BASE_URL}/targets/:id/organizations/`, ({ params, request }) => {
    const id = Number(params.id)
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('pageSize')) || 10

    const data = getTargetOrganizations(id, page, pageSize)
    return HttpResponse.json(data, { status: 200 })
  }),

  // 关联目标与组织
  http.post(`${BASE_URL}/targets/:id/organizations/`, async ({ params, request }) => {
    const id = Number(params.id)
    const body = (await request.json()) as { organizationIds: number[] }

    if (!body.organizationIds || body.organizationIds.length === 0) {
      return HttpResponse.json({ message: '组织 ID 列表不能为空' }, { status: 400 })
    }

    const result = linkTargetOrganizations(id, body.organizationIds)

    if (!result) {
      return HttpResponse.json({ message: '目标不存在' }, { status: 404 })
    }

    return HttpResponse.json(result, { status: 200 })
  }),

  // 取消目标与组织的关联
  http.post(`${BASE_URL}/targets/:id/organizations/unlink/`, async ({ params, request }) => {
    const id = Number(params.id)
    const body = (await request.json()) as { organizationIds: number[] }

    if (!body.organizationIds || body.organizationIds.length === 0) {
      return HttpResponse.json({ message: '组织 ID 列表不能为空' }, { status: 400 })
    }

    const result = unlinkTargetOrganizations(id, body.organizationIds)

    if (!result) {
      return HttpResponse.json({ message: '目标不存在' }, { status: 404 })
    }

    return HttpResponse.json(result, { status: 200 })
  }),
]

