export interface DiscordSettings {
  enabled: boolean
  webhookUrl: string
}

export interface NotificationPreferences {
  scanUpdates: boolean
  interestingSubdomains: boolean
  vulnerabilitiesFound: boolean
  subdomainChanges: boolean
}

export interface NotificationSettings {
  discord: DiscordSettings
  preferences: NotificationPreferences
}

export type GetNotificationSettingsResponse = NotificationSettings

export type UpdateNotificationSettingsRequest = NotificationSettings

export interface UpdateNotificationSettingsResponse {
  message: string
  settings: NotificationSettings
}
