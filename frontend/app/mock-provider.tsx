"use client"

/**
 * MSW Mock Provider
 * 在客户端启动 MSW
 */

import { useEffect, useState } from "react"

export function MockProvider({ children }: { children: React.ReactNode }) {
  const [mockingEnabled, setMockingEnabled] = useState(false)

  useEffect(() => {
    async function init() {
      console.log("🔧 [MockProvider] 开始初始化...")
      
      // 检查是否存在 mock 目录（通过尝试导入）
      try {
        const { enableMocking } = await import("@/mock")
        console.log("📦 [MockProvider] Mock 模块加载成功")
        
        await enableMocking()
        console.log("✅ [MockProvider] MSW 启动成功")
        
        setMockingEnabled(true)
        console.log("✅ [MSW] Mock 数据已启用")
      } catch (error) {
        // mock 目录不存在，使用真实 API
        console.warn("⚠️ [MockProvider] Mock 模块加载失败，使用真实 API:", error)
        setMockingEnabled(true)
        console.log("✅ [Real API] 使用真实后端 API")
      }
    }

    init()
  }, [])

  // 等待 MSW 初始化完成
  if (!mockingEnabled) {
    console.log("⏳ [MockProvider] 等待初始化...")
    return null
  }

  console.log("🎉 [MockProvider] 渲染子组件")
  return <>{children}</>
}
