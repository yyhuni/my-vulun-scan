/**
 * UI 组件统一导出
 * 
 * 这个文件提供了项目中所有 UI 组件的统一导出
 * 默认导出增强版组件，保持向后兼容
 */

// 导出原始组件（如果需要）
export { Button as OriginalButton, buttonVariants } from './button'

// 导出增强版组件作为默认
export { EnhancedButton as Button } from './enhanced-button'
export type { EnhancedButtonProps as ButtonProps } from './enhanced-button'

// 其他 UI 组件
export * from './badge'
export * from './card'
export * from './input'
export * from './table'
export * from './dropdown-menu'
// ... 可以继续添加其他组件
