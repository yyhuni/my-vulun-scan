/**
 * Mock Handlers - 工具相关 API
 */
import { http, HttpResponse } from 'msw'
import { mockTools, getToolById, getPaginatedTools } from '../fixtures/tools'
import type { CreateToolRequest, UpdateToolRequest } from '@/types/tool.types'

const BASE_URL = '/api'

export const toolHandlers = [
  // 获取工具列表
  http.get(`${BASE_URL}/tools/`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('page_size')) || 10

    const data = getPaginatedTools(page, pageSize)

    return HttpResponse.json(data, { status: 200 })
  }),

  // 获取单个工具详情
  http.get(`${BASE_URL}/tools/:id/`, ({ params }) => {
    const id = Number(params.id)
    const tool = getToolById(id)

    if (!tool) {
      return HttpResponse.json(
        { message: '工具不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json({ tool }, { status: 200 })
  }),

  // 创建工具
  http.post(`${BASE_URL}/tools/create/`, async ({ request }) => {
    const body = await request.json() as CreateToolRequest
    
    if (!body.name) {
      return HttpResponse.json(
        { message: '工具名称不能为空' },
        { status: 400 }
      )
    }

    const newTool = {
      id: mockTools.length + 1,
      name: body.name,
      type: body.type || 'opensource',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      repoUrl: body.repoUrl,
      version: body.version,
      description: body.description,
      categoryNames: body.categoryNames || [],
      directory: body.directory || '',
      installCommand: body.installCommand || '',
      updateCommand: body.updateCommand || '',
      versionCommand: body.versionCommand || '',
    }

    return HttpResponse.json(
      { 
        tool: newTool,
        message: '工具创建成功' 
      },
      { status: 201 }
    )
  }),

  // 更新工具
  http.put(`${BASE_URL}/tools/:id/`, async ({ params, request }) => {
    const id = Number(params.id)
    const tool = getToolById(id)

    if (!tool) {
      return HttpResponse.json(
        { message: '工具不存在' },
        { status: 404 }
      )
    }

    const body = await request.json() as UpdateToolRequest
    const updatedTool = { 
      ...tool, 
      ...body,
      updatedAt: new Date().toISOString()
    }

    return HttpResponse.json(
      { 
        tool: updatedTool,
        message: '工具更新成功' 
      },
      { status: 200 }
    )
  }),

  // 删除工具
  http.delete(`${BASE_URL}/tools/:id/`, ({ params }) => {
    const id = Number(params.id)
    const tool = getToolById(id)

    if (!tool) {
      return HttpResponse.json(
        { message: '工具不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json(
      { message: '工具删除成功' },
      { status: 200 }
    )
  }),
]
