/**
 * Mock 数据统一导出
 * 
 * 使用方式：
 * import { USE_MOCK, mockData } from '@/mock'
 * 
 * if (USE_MOCK) {
 *   return mockData.dashboard.assetStatistics
 * }
 */

export { USE_MOCK, MOCK_DELAY, mockDelay } from './config'

// Dashboard
export {
  mockDashboardStats,
  mockAssetStatistics,
  mockStatisticsHistory7Days,
  mockStatisticsHistory30Days,
  getMockStatisticsHistory,
} from './data/dashboard'

// Organizations
export {
  mockOrganizations,
  getMockOrganizations,
} from './data/organizations'

// Targets
export {
  mockTargets,
  mockTargetDetails,
  getMockTargets,
  getMockTargetById,
} from './data/targets'

// Scans
export {
  mockScans,
  mockScanStatistics,
  getMockScans,
  getMockScanById,
} from './data/scans'

// Vulnerabilities
export {
  mockVulnerabilities,
  getMockVulnerabilities,
  getMockVulnerabilityById,
} from './data/vulnerabilities'

// Endpoints
export {
  mockEndpoints,
  getMockEndpoints,
  getMockEndpointById,
} from './data/endpoints'

// Websites
export {
  mockWebsites,
  getMockWebsites,
  getMockWebsiteById,
} from './data/websites'

// Subdomains
export {
  mockSubdomains,
  getMockSubdomains,
  getMockSubdomainById,
} from './data/subdomains'

// Auth
export {
  mockUser,
  mockMeResponse,
  mockLoginResponse,
  mockLogoutResponse,
} from './data/auth'

// Engines
export {
  mockEngines,
  getMockEngines,
  getMockEngineById,
} from './data/engines'

// Workers
export {
  mockWorkers,
  getMockWorkers,
  getMockWorkerById,
} from './data/workers'

// Notifications
export {
  mockNotifications,
  getMockNotifications,
  getMockUnreadCount,
} from './data/notifications'

// Scheduled Scans
export {
  mockScheduledScans,
  getMockScheduledScans,
  getMockScheduledScanById,
} from './data/scheduled-scans'

// Directories
export {
  mockDirectories,
  getMockDirectories,
  getMockDirectoryById,
} from './data/directories'

// Fingerprints
export {
  mockEholeFingerprints,
  mockGobyFingerprints,
  mockWappalyzerFingerprints,
  mockFingersFingerprints,
  mockFingerPrintHubFingerprints,
  mockARLFingerprints,
  mockFingerprintStats,
  getMockEholeFingerprints,
  getMockGobyFingerprints,
  getMockWappalyzerFingerprints,
  getMockFingersFingerprints,
  getMockFingerPrintHubFingerprints,
  getMockARLFingerprints,
  getMockFingerprintStats,
} from './data/fingerprints'

// IP Addresses
export {
  mockIPAddresses,
  getMockIPAddresses,
  getMockIPAddressByIP,
} from './data/ip-addresses'

// Search
export {
  getMockSearchResults,
} from './data/search'

// Tools
export {
  mockTools,
  getMockTools,
  getMockToolById,
} from './data/tools'

// Wordlists
export {
  mockWordlists,
  mockWordlistContent,
  getMockWordlists,
  getMockWordlistById,
  getMockWordlistContent,
} from './data/wordlists'

// Nuclei Templates
export {
  mockNucleiTemplateTree,
  mockNucleiTemplateContent,
  getMockNucleiTemplateTree,
  getMockNucleiTemplateContent,
} from './data/nuclei-templates'

// System Logs
export {
  mockLogFiles,
  mockSystemLogContent,
  mockErrorLogContent,
  getMockLogFiles,
  getMockSystemLogs,
} from './data/system-logs'

// Notification Settings
export {
  mockNotificationSettings,
  getMockNotificationSettings,
  updateMockNotificationSettings,
} from './data/notification-settings'
