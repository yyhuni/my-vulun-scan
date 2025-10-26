/**
 * MSW Handlers - 导出所有 handlers
 */

import { organizationHandlers } from "./organizations"
import { assetHandlers } from "./assets"
import { domainHandlers } from "./domains"
import { endpointHandlers } from "./endpoints"
import { toolHandlers } from "./tools"

export const handlers = [
  ...organizationHandlers,
  ...assetHandlers,
  ...domainHandlers,
  ...endpointHandlers,
  ...toolHandlers,
]
