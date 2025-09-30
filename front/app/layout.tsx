import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import Loading from '@/components/common/loading'
import NavigationLoading from '@/components/common/navigation-loading'
import NavigationProvider from '@/components/providers/navigation-provider'
import PreloadProvider from '@/components/providers/preload-provider'
import { Toaster } from "@/components/ui/sonner"


import { ChunkErrorBoundary } from '@/components/common/chunk-error-boundary'

export const metadata: Metadata = {
  title: 'Xingra - 资产安全扫描平台',
  description: '专业的安全扫描和资产管理平台',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="h-full">
        <div id="__next" className="min-h-screen">
          <ChunkErrorBoundary>
            <NavigationProvider>
              <PreloadProvider>
                <Suspense fallback={<Loading fullScreen={true} text="正在加载应用" />}>
                  {children}
                  <Toaster />
                </Suspense>
                {/* 全局导航 loading */}
                <NavigationLoading />
              </PreloadProvider>
            </NavigationProvider>
          </ChunkErrorBoundary>
        </div>
      </body>
    </html>
  )
}
