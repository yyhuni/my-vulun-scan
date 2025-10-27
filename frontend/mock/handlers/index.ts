/**
 * Mock Handlers - 统一导出
 */
import { organizationHandlers } from './organizations'
import { targetHandlers } from './targets'
import { vulnerabilityHandlers } from './vulnerabilities'

/**
 * 所有 API 的 mock handlers
 */
export const handlers = [
  ...organizationHandlers,
  ...targetHandlers,
  ...vulnerabilityHandlers,
]

