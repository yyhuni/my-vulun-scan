/**
 * Mock Provider - 在开发环境中启动 Mock Service Worker
 * 
 * 使用方法：
 * 将此组件添加到根 layout 中，仅在需要时启用 Mock
 */
'use client'

import { useEffect, useState } from 'react'

export function MockProvider({ children }: { children: React.ReactNode }) {
  const [mockReady, setMockReady] = useState(false)

  useEffect(() => {
    // 检查是否需要启用 Mock
    // 可以通过环境变量 NEXT_PUBLIC_ENABLE_MOCK 控制
    const shouldEnableMock = 
      process.env.NODE_ENV === 'development' && 
      process.env.NEXT_PUBLIC_ENABLE_MOCK === 'true'

    if (!shouldEnableMock) {
      setMockReady(true)
      return
    }

    // 动态导入 Mock Worker（仅在需要时加载）
    async function initMock() {
      try {
        const { startMockWorker } = await import('../../mock')
        await startMockWorker()
        setMockReady(true)
      } catch (error) {
        console.error('❌ 无法启动 Mock Service Worker:', error)
        // 即使失败也继续渲染应用
        setMockReady(true)
      }
    }

    initMock()
  }, [])

  // 在 Mock 准备好之前显示加载状态（可选）
  // 如果不需要等待 Mock 准备完成，可以直接返回 children
  if (!mockReady) {
    return null // 或者返回一个加载指示器
  }

  return <>{children}</>
}

