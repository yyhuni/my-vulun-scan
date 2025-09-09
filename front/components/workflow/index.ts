/**
 * Workflow 组件库主导出文件
 * 
 * 这个文件提供了工作流系统所有组件的统一导出入口，
 * 使得外部模块可以通过单一路径导入所需的组件。
 * 
 * 使用示例：
 * ```typescript
 * import { Canvas, Toolbar, NodeDetail, SaveDialog } from '@/components/pages/workflow'
 * ```
 * 
 * 组件分类：
 * - Canvas: 画布相关组件
 * - Toolbar: 工具栏相关组件  
 * - Nodes: 节点相关组件
 * - Panels: 面板相关组件
 * - Dialogs: 对话框相关组件
 * - Pages: 页面级组件
 */

// 核心组件
export * from './core'

// 节点组件
export * from './nodes'

// 面板组件
export * from './panels'

// 对话框组件
export * from './dialogs'

// 页面组件
export * from './pages'
