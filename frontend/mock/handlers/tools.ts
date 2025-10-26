/**
 * MSW Handlers - 工具相关 API
 */

import { http, HttpResponse } from "msw"
import { mockTools, getNextToolId } from "../data/tools"

const BASE_URL = "/api"  // 相对路径，MSW 会自动匹配

export const toolHandlers = [
  // 获取所有工具
  http.get(`${BASE_URL}/tools/`, () => {
    return HttpResponse.json({
      tools: mockTools,
      total: mockTools.length,
      page: 1,
      pageSize: 10,
      totalPages: Math.ceil(mockTools.length / 10),
    })
  }),

  // 获取单个工具
  http.get(`${BASE_URL}/tools/:id/`, ({ params }) => {
    const id = parseInt(params.id as string)
    const tool = mockTools.find((t) => t.id === id)

    if (!tool) {
      return HttpResponse.json({ detail: "未找到工具" }, { status: 404 })
    }

    return HttpResponse.json(tool)
  }),

  // 创建工具
  http.post(`${BASE_URL}/tools/`, async ({ request }) => {
    const body = (await request.json()) as any
    const newTool = {
      id: getNextToolId(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mockTools.push(newTool as any)
    return HttpResponse.json(newTool, { status: 201 })
  }),

  // 更新工具
  http.patch(`${BASE_URL}/tools/:id/`, async ({ params, request }) => {
    const id = parseInt(params.id as string)
    const body = (await request.json()) as any
    const toolIndex = mockTools.findIndex((t) => t.id === id)

    if (toolIndex === -1) {
      return HttpResponse.json({ detail: "未找到工具" }, { status: 404 })
    }

    mockTools[toolIndex] = {
      ...mockTools[toolIndex],
      ...body,
      updatedAt: new Date().toISOString(),
    } as any

    return HttpResponse.json(mockTools[toolIndex])
  }),

  // 删除工具
  http.delete(`${BASE_URL}/tools/:id/`, ({ params }) => {
    const id = parseInt(params.id as string)
    const toolIndex = mockTools.findIndex((t) => t.id === id)

    if (toolIndex === -1) {
      return HttpResponse.json({ detail: "未找到工具" }, { status: 404 })
    }

    mockTools.splice(toolIndex, 1)
    return HttpResponse.json({ success: true }, { status: 204 })
  }),
]
