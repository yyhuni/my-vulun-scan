/**
 * Pages 模块导出
 * 
 * 包含工作流页面相关的所有组件：
 * - 编辑器页面
 * - 管理页面
 * - 组件列表页面
 * - 其他页面组件
 */

// 编辑器相关
export { default as WorkflowEditor } from '../../canvas/core/canvas-workflow-editor'

// 管理相关
export { default as WorkflowManagementPage } from './management'

// 组件管理相关
export { default as WorkflowComponentsList } from './components-list'
export { default as WorkflowAddComponentPage } from './add-component'

// 概览页面
export { default as WorkflowOverviewPage } from './overview'

// 页面聚合导出
export { WorkflowHistoryPage, WorkflowTemplatesPage } from './page-exports'
