export interface SystemLogResponse {
  content: string
}

export type LogCategory = 'system' | 'error' | 'performance' | 'container'

export interface LogFile {
  filename: string
  category: LogCategory
  size: number
  modifiedAt: string
}

export interface LogFilesResponse {
  files: LogFile[]
}
