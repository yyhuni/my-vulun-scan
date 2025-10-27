/**
 * Mock Handlers - 统一导出
 */
import { organizationHandlers } from './organizations'
import { assetHandlers } from './assets'
import { targetHandlers } from './targets'

/**
 * 所有 API 的 mock handlers
 */
export const handlers = [
  ...organizationHandlers,
  ...assetHandlers,
  ...targetHandlers,
]

