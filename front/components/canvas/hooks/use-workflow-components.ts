/**
 * useWorkflowComponents hook 的导出代理
 *
 * 目的：
 * - 统一导入路径，提高代码一致性
 * - 未来如果该 hook 变得复杂，可以在此扩展
 */

export { useWorkflowComponents } from '../components-context'
export type { WorkflowComponent } from '../components-context'

