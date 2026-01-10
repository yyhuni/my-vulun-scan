import { api } from '@/lib/api-client'
import type { VersionInfo, UpdateCheckResult } from '@/types/version.types'

export class VersionService {
  static async getVersion(): Promise<VersionInfo> {
    const res = await api.get<VersionInfo>('/system/version/')
    return res.data
  }

  static async checkUpdate(): Promise<UpdateCheckResult> {
    const res = await api.get<UpdateCheckResult>('/system/check-update/')
    return res.data
  }
}
