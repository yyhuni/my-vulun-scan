export interface DiscordSettings {
  enabled: boolean
  webhookUrl: string
}

export interface WeComSettings {
  enabled: boolean
  webhookUrl: string
}

/** Notification category - corresponds to backend NotificationCategory */
export type NotificationCategory = 'scan' | 'vulnerability' | 'asset' | 'system'

/** Notification switches by category */
export interface NotificationCategories {
  scan: boolean        // Scan tasks
  vulnerability: boolean // Vulnerability discovery
  asset: boolean       // Asset discovery
  system: boolean      // System messages
}

export interface NotificationSettings {
  discord: DiscordSettings
  wecom: WeComSettings
  categories: NotificationCategories
}

export type GetNotificationSettingsResponse = NotificationSettings

export type UpdateNotificationSettingsRequest = NotificationSettings

export interface UpdateNotificationSettingsResponse {
  message: string
  discord: DiscordSettings
  wecom: WeComSettings
  categories: NotificationCategories
}
