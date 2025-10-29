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
    // 检查是否已经有 Service Worker 在控制页面
    const hadController = navigator.serviceWorker?.controller !== null
    
    await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: false, // 显示 MSW 启动消息
      serviceWorker: {
        url: '/mockServiceWorker.js',
        options: {
          // Service Worker 更新策略
          scope: '/',
        },
      },
    })
    
    console.log('🎭 Mock Service Worker 已启动')
    
    // 如果之前没有 controller，等待 Service Worker 激活并控制页面
    if (!hadController && 'serviceWorker' in navigator) {
      console.log('⏳ 首次启动，等待 Service Worker 激活...')
      
      // 等待 Service Worker 就绪
      await navigator.serviceWorker.ready
      
      // 检查是否已经控制页面
      if (navigator.serviceWorker.controller) {
        console.log('✅ Service Worker 已激活并控制页面')
      } else {
        // 强制刷新以激活 Service Worker
        console.log('🔄 正在刷新页面以激活 Service Worker...')
        window.location.reload()
      }
    } else {
      console.log('✅ Service Worker 已经在控制页面')
    }
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

