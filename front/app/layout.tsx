import type React from "react"
// 导入 Next.js 的元数据类型定义
import type { Metadata } from "next"
// 导入 Geist 字体系列 - 包括无衬线字体和等宽字体
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"

// 导入全局样式文件
import "./globals.css"
import { Suspense } from "react"
import NavigationProvider from "@/components/providers/navigation-provider"

// 定义页面的元数据信息,用于 SEO 优化
export const metadata: Metadata = {
  title: "v0 App", // 页面标题
  description: "Created with v0", // 页面描述
  generator: "v0.app", // 生成器标识
}

/**
 * 根布局组件
 * 这是整个应用的最外层布局,所有页面都会被包裹在这个组件中
 * @param children - 子组件内容,即各个页面的实际内容
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // 设置 HTML 根元素,语言为英文
    <html lang="en">
      {/* 
        body 元素应用字体样式
        - font-sans: 应用无衬线字体作为默认字体
        - GeistSans.variable: Geist 无衬线字体的 CSS 变量
        - GeistMono.variable: Geist 等宽字体的 CSS 变量
      */}
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {/* 使用 NavigationProvider 包裹整个应用 */}
        <NavigationProvider>
          {/* 使用 Suspense 包裹页面内容 */}
          <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
        </NavigationProvider>
      </body>
    </html>
  )
}
