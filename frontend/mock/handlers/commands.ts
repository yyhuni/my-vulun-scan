/**
 * Mock Handlers - 命令相关 API
 */
import { http, HttpResponse } from 'msw'
import { mockCommands, getCommandById, getPaginatedCommands } from '../fixtures/commands'
import type { CreateCommandRequest, UpdateCommandRequest } from '@/types/command.types'

const BASE_URL = '/api'

export const commandHandlers = [
  // 获取命令列表
  http.get(`${BASE_URL}/commands/`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('page_size')) || 10
    const toolId = url.searchParams.get('tool_id')

    const data = getPaginatedCommands(
      page, 
      pageSize, 
      toolId ? Number(toolId) : undefined
    )

    return HttpResponse.json(data, { status: 200 })
  }),

  // 获取单个命令详情
  http.get(`${BASE_URL}/commands/:id/`, ({ params }) => {
    const id = Number(params.id)
    const command = getCommandById(id)

    if (!command) {
      return HttpResponse.json(
        { message: '命令不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json({ command }, { status: 200 })
  }),

  // 创建命令
  http.post(`${BASE_URL}/commands/create/`, async ({ request }) => {
    const body = await request.json() as CreateCommandRequest
    
    if (!body.name || !body.toolId) {
      return HttpResponse.json(
        { message: '命令名称和工具ID不能为空' },
        { status: 400 }
      )
    }

    const newCommand = {
      id: mockCommands.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tool_id: body.toolId,
      name: body.name,
      display_name: body.displayName || body.name,
      description: body.description || '',
      command_template: body.commandTemplate,
    }

    return HttpResponse.json(
      { 
        command: newCommand,
        message: '命令创建成功' 
      },
      { status: 201 }
    )
  }),

  // 更新命令
  http.put(`${BASE_URL}/commands/:id/`, async ({ params, request }) => {
    const id = Number(params.id)
    const command = getCommandById(id)

    if (!command) {
      return HttpResponse.json(
        { message: '命令不存在' },
        { status: 404 }
      )
    }

    const body = await request.json() as UpdateCommandRequest
    const updatedCommand = { 
      ...command, 
      ...body,
      updated_at: new Date().toISOString()
    }

    return HttpResponse.json(
      { 
        command: updatedCommand,
        message: '命令更新成功' 
      },
      { status: 200 }
    )
  }),

  // 删除命令
  http.delete(`${BASE_URL}/commands/:id/`, ({ params }) => {
    const id = Number(params.id)
    const command = getCommandById(id)

    if (!command) {
      return HttpResponse.json(
        { message: '命令不存在' },
        { status: 404 }
      )
    }

    return HttpResponse.json(
      { message: '命令删除成功' },
      { status: 200 }
    )
  }),

  // 批量删除命令
  http.post(`${BASE_URL}/commands/batch-delete/`, async ({ request }) => {
    const body = await request.json() as { ids: number[] }
    
    if (!body.ids || body.ids.length === 0) {
      return HttpResponse.json(
        { message: '命令ID列表不能为空' },
        { status: 400 }
      )
    }

    const deletedCount = body.ids.length

    return HttpResponse.json(
      { 
        deleted_count: deletedCount,
        message: '批量删除成功' 
      },
      { status: 200 }
    )
  }),
]
