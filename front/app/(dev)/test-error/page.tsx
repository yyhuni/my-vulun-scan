'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChunkErrorBoundary } from '@/components/common/chunk-error-boundary'

// 测试组件，用于触发错误
function ErrorTrigger() {
  const [shouldError, setShouldError] = useState(false)

  if (shouldError) {
    // 模拟一个复杂的错误，包含长堆栈信息
    const error = new Error(`这是一个非常长的错误消息，用于测试错误边界的显示效果。这个错误消息包含了很多详细信息，比如：
    
1. 错误发生的具体位置和原因
2. 相关的组件状态和属性信息  
3. 可能的解决方案和调试建议
4. 系统环境和配置信息
5. 用户操作历史和上下文数据

这样的长错误消息在实际开发中很常见，特别是在复杂的应用程序中，错误信息往往包含大量的调试信息和上下文数据，这些信息对于开发者调试问题非常重要，但同时也会导致错误显示界面的布局问题。

我们需要确保错误边界组件能够正确处理这种长文本，不会导致UI布局破坏或者文本溢出容器的问题。`)
    
    error.stack = `Error: 这是一个测试错误
    at ErrorTrigger (http://localhost:3001/_next/static/chunks/app/test-error/page.js:25:15)
    at renderWithHooks (http://localhost:3001/_next/static/chunks/webpack.js:1234:56)
    at updateFunctionComponent (http://localhost:3001/_next/static/chunks/webpack.js:2345:67)
    at beginWork (http://localhost:3001/_next/static/chunks/webpack.js:3456:78)
    at HTMLUnknownElement.callCallback (http://localhost:3001/_next/static/chunks/webpack.js:4567:89)
    at Object.invokeGuardedCallbackDev (http://localhost:3001/_next/static/chunks/webpack.js:5678:90)
    at invokeGuardedCallback (http://localhost:3001/_next/static/chunks/webpack.js:6789:01)
    at beginWork$1 (http://localhost:3001/_next/static/chunks/webpack.js:7890:12)
    at performUnitOfWork (http://localhost:3001/_next/static/chunks/webpack.js:8901:23)
    at workLoopSync (http://localhost:3001/_next/static/chunks/webpack.js:9012:34)
    at renderRootSync (http://localhost:3001/_next/static/chunks/webpack.js:0123:45)
    at performSyncWorkOnRoot (http://localhost:3001/_next/static/chunks/webpack.js:1234:56)
    at scheduleUpdateOnFiber (http://localhost:3001/_next/static/chunks/webpack.js:2345:67)
    at updateContainer (http://localhost:3001/_next/static/chunks/webpack.js:3456:78)
    at ReactDOMRoot.render (http://localhost:3001/_next/static/chunks/webpack.js:4567:89)`
    
    throw error
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>错误边界测试</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-gray-600">
          点击下面的按钮来触发一个错误，测试错误边界组件的显示效果。
        </p>
        <Button 
          onClick={() => setShouldError(true)}
          variant="destructive"
        >
          触发错误
        </Button>
      </CardContent>
    </Card>
  )
}

export default function TestErrorPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">错误边界测试页面</h1>
      <ChunkErrorBoundary>
        <ErrorTrigger />
      </ChunkErrorBoundary>
    </div>
  )
}
