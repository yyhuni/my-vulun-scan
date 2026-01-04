import type {
  NotificationSettings,
  GetNotificationSettingsResponse,
  UpdateNotificationSettingsResponse,
} from '@/types/notification-settings.types'

export const mockNotificationSettings: NotificationSettings = {
  discord: {
    enabled: true,
    webhookUrl: 'https://discord.com/api/webhooks/1234567890/abcdefghijklmnop',
  },
  categories: {
    scan: true,
    vulnerability: true,
    asset: true,
    system: false,
  },
}

export function getMockNotificationSettings(): GetNotificationSettingsResponse {
  return mockNotificationSettings
}

export function updateMockNotificationSettings(
  settings: NotificationSettings
): UpdateNotificationSettingsResponse {
  // 模拟更新设置
  Object.assign(mockNotificationSettings, settings)
  
  return {
    message: 'Notification settings updated successfully',
    discord: mockNotificationSettings.discord,
    categories: mockNotificationSettings.categories,
  }
}
