/**
 * Mock 模块统一导出
 * 
 * 使用方法：
 * 
 * 1. 在应用启动时初始化 Mock：
 *    ```ts
 *    import { startMockWorker } from '@mock'
 *    
 *    if (process.env.NODE_ENV === 'development') {
 *      startMockWorker()
 *    }
 *    ```
 * 
 * 2. 在测试中使用：
 *    ```ts
 *    import { handlers } from '@mock'
 *    import { setupServer } from 'msw/node'
 *    
 *    const server = setupServer(...handlers)
 *    ```
 */

export { worker, startMockWorker, stopMockWorker } from './browser'
export { handlers } from './handlers'

// 导出 fixtures 供测试使用
export * from './fixtures/organizations'
export * from './fixtures/assets'
export * from './fixtures/domains'
export * from './fixtures/endpoints'

