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
    // 通过环境变量 NEXT_PUBLIC_ENABLE_MOCK 控制
    const nodeEnv = process.env.NODE_ENV
    const enableMock = process.env.NEXT_PUBLIC_ENABLE_MOCK
    
    console.log('🔍 MockProvider 环境检查:', {
      NODE_ENV: nodeEnv,
      NEXT_PUBLIC_ENABLE_MOCK: enableMock,
      window: typeof window !== 'undefined' ? '浏览器环境' : '服务端环境'
    })
    
    const shouldEnableMock = 
      nodeEnv === 'development' && 
      enableMock === 'true'

    if (!shouldEnableMock) {
      console.log('⏭️ MockProvider: 不启动 MSW')
      setMockReady(true)
      return
    }

    console.log('🚀 MockProvider: 准备启动 MSW')

    // 动态导入 Mock Worker（仅在需要时加载）
    async function initMock() {
      try {
        console.log('📦 MockProvider: 导入 MSW 模块...')
        const { startMockWorker } = await import('../../mock')
        console.log('✅ MockProvider: MSW 模块导入成功')
        await startMockWorker()
        console.log('✅ MockProvider: MSW 启动完成')
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

