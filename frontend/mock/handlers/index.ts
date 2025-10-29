/**
 * Mock Handlers - 统一导出
 */
import { organizationHandlers } from './organizations'
import { targetHandlers } from './targets'
import { vulnerabilityHandlers } from './vulnerabilities'
import { dashboardHandlers } from './dashboard'
import { scansHandlers } from './scans'
import { scheduledScanHandlers } from './scheduled-scans'
import { diskHandlers } from './disk'

/**
 * 所有 API 的 mock handlers
 */
export const handlers = [
  ...dashboardHandlers,
  ...organizationHandlers,
  ...targetHandlers,
  ...vulnerabilityHandlers,
  ...scansHandlers,
  ...scheduledScanHandlers,
  ...diskHandlers,
]

