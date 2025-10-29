import { http, HttpResponse } from 'msw'
import { mockNotificationSettings } from '../fixtures/notification-settings'
import type { NotificationSettings } from '@/types/notification-settings.types'

const BASE_URL = '/api'

let settings: NotificationSettings = { ...mockNotificationSettings }

export const notificationSettingsHandlers = [
  http.get(`${BASE_URL}/settings/notifications/`, () => {
    return HttpResponse.json(settings, { status: 200 })
  }),

  http.put(`${BASE_URL}/settings/notifications/`, async ({ request }) => {
    const body = (await request.json()) as Partial<NotificationSettings>
    settings = { ...settings, ...body }
    return HttpResponse.json(
      {
        message: '保存成功',
        settings,
      },
      { status: 200 }
    )
  }),
]
