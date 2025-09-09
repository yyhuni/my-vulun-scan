/**
 * Panels 模块导出
 * 
 * 包含工作流面板相关的所有组件：
 * - NodeDetail: 节点详情面板
 * - NodeConfig: 节点配置面板
 * - ExecutionLogs: 执行日志面板
 * - TerminalDialog: 终端对话框
 */

export { NodeDetail } from '../../canvas/panels/node-detail-panel'
export type { NodeDetailProps } from '../../canvas/panels/node-detail-panel'

export { NodeParameterConfig } from '../../canvas/node-configuration-panel'
export type { NodeParameterConfigProps, ParameterConfig } from '../../canvas/node-configuration-panel'

export { ConstantsConfig } from '../../canvas/variable-config-panel'
export { EnhancedNodeConfig } from '../../canvas/advanced-node-config'

export { ExecutionLogs } from '../../canvas/panels/execution-logs-panel'
export type { ExecutionLogsProps } from '../../canvas/panels/execution-logs-panel'

export { TerminalLogDialog } from '../../canvas/terminal-dialog'
