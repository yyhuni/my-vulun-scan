/**
 * Mock Handlers - 通知相关 API
 */
import { http, HttpResponse } from 'msw'
import { 
  mockNotifications, 
  getUnreadCount, 
  getPaginatedNotifications 
} from '../fixtures/notifications'

const BASE_URL = '/api'

export const notificationHandlers = [
  // 获取通知列表
  http.get(`${BASE_URL}/notifications/`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('page_size')) || 10
    const unread = url.searchParams.get('unread')

    const data = getPaginatedNotifications(
      page, 
      pageSize, 
      unread === 'true' ? true : unread === 'false' ? false : undefined
    )

    return HttpResponse.json({
      success: true,
      data,
    }, { status: 200 })
  }),

  // 获取未读通知数量
  http.get(`${BASE_URL}/notifications/unread-count/`, () => {
    const count = getUnreadCount()

    return HttpResponse.json({
      success: true,
      data: { count },
    }, { status: 200 })
  }),

  // 标记通知为已读
  http.post(`${BASE_URL}/notifications/mark-as-read/`, async ({ request }) => {
    const body = await request.json() as { notification_ids: number[] }
    
    if (!body.notification_ids || body.notification_ids.length === 0) {
      return HttpResponse.json(
        { 
          success: false,
          message: '通知ID列表不能为空' 
        },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: null,
      message: '标记成功',
    }, { status: 200 })
  }),

  // 标记所有通知为已读
  http.post(`${BASE_URL}/notifications/mark-all-as-read/`, () => {
    return HttpResponse.json({
      success: true,
      data: null,
      message: '全部标记成功',
    }, { status: 200 })
  }),

  // 删除通知
  http.delete(`${BASE_URL}/notifications/`, async ({ request }) => {
    const body = await request.json() as { notification_ids: number[] }
    
    if (!body.notification_ids || body.notification_ids.length === 0) {
      return HttpResponse.json(
        { 
          success: false,
          message: '通知ID列表不能为空' 
        },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: null,
      message: '删除成功',
    }, { status: 200 })
  }),
]
