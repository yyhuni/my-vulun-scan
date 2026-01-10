export interface VersionInfo {
  version: string
  githubRepo: string
}

export interface UpdateCheckResult {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseUrl: string
  releaseNotes: string | null
  publishedAt: string | null
}
