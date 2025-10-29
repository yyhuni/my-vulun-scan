import type { NotificationSettings } from '@/types/notification-settings.types'

export const mockNotificationSettings: NotificationSettings = {
  discord: {
    enabled: false,
    webhookUrl: '',
  },
  preferences: {
    scanUpdates: true,
    interestingSubdomains: true,
    vulnerabilitiesFound: true,
    subdomainChanges: false,
  },
}
