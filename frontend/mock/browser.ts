/**
 * Mock Service Worker - 浏览器端初始化
 * 
 * 这个文件用于在浏览器环境中初始化 MSW
 */
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/**
 * 创建浏览器端的 Service Worker
 */
export const worker = setupWorker(...handlers)

/**
 * 启动 Mock Service Worker
 * 
 * 配置选项：
 * - onUnhandledRequest: 'bypass' - 对于没有 mock 的请求，直接放行到真实服务器
 */
export async function startMockWorker() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      const hasMock = registrations.some((r) =>
        [r.active?.scriptURL, r.installing?.scriptURL, r.waiting?.scriptURL]
          .filter(Boolean)
          .some((u) => (u as string).includes('mockServiceWorker.js'))
      )
      if (!navigator.serviceWorker.controller && hasMock) {
        return
      }
    }
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    })
    console.log('🎭 Mock Service Worker 已启动')
  } catch (error) {
    console.error('❌ Mock Service Worker 启动失败:', error)
  }
}

/**
 * 停止 Mock Service Worker
 */
export function stopMockWorker() {
  worker.stop()
  console.log('🎭 Mock Service Worker 已停止')
}

