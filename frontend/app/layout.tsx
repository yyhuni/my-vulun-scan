import type React from "react"
// 导入 Next.js 的元数据类型定义
import type { Metadata } from "next"

// 导入全局样式文件
import "./globals.css"
import { Suspense } from "react"
import NextTopLoader from "nextjs-toploader"
import { QueryProvider } from "@/components/providers/query-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Noto_Sans_SC } from "next/font/google"

// 导入公共布局组件
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { LoadingState } from "@/components/loading-spinner"
import { RoutePrefetch } from "@/components/route-prefetch"

// 定义页面的元数据信息,用于 SEO 优化
export const metadata: Metadata = {
  title: "v0 App", // 页面标题
  description: "Created with v0", // 页面描述
  generator: "v0.app", // 生成器标识
}

// 全站字体：Noto Sans SC（简体中文），兼顾中英文显示，系统字体作为回退
const notoSans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
  fallback: ["system-ui", "-apple-system", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "sans-serif"],
})

/**
 * 根布局组件
 * 这是整个应用的最外层布局,所有页面都会被包裹在这个组件中
 * 包含公共的侧边栏、头部等布局组件
 * @param children - 子组件内容,即各个页面的实际内容
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // 设置 HTML 根元素,语言为中文
    // suppressHydrationWarning 避免主题切换时的 hydration 警告
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={notoSans.className}>
        {/* ThemeProvider 提供主题切换功能,跟随系统自动切换亮暗色 */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* 顶部路由加载进度条 - 自动检测路由变化 */}
          <NextTopLoader
            color="#6b7280"
            height={3}
            showSpinner={false}
            speed={200}
            easing="ease"
            crawlSpeed={300}
            initialPosition={0.4}
            shadow="0 0 10px rgba(107, 114, 128, 0.4), 0 0 5px rgba(107, 114, 128, 0.3)"
            zIndex={99999}
          />
          {/* 使用 QueryProvider 提供 React Query 功能 */}
          <QueryProvider>
            {/* 路由预加载：在后台预加载常用页面的 JS/CSS 资源 */}
            <RoutePrefetch />
            {/* SidebarProvider 提供侧边栏的上下文状态管理 */}
            <SidebarProvider
              // 自定义 CSS 变量,设置侧边栏宽度和头部高度
              style={
                {
                  "--sidebar-width": "calc(var(--spacing) * 70)", // 侧边栏宽度为 70 个间距单位
                  "--header-height": "calc(var(--spacing) * 11)", // 头部高度为 11 个间距单位
                } as React.CSSProperties
              }
            >
              {/* 应用侧边栏,使用 inset 变体样式 */}
              <AppSidebar variant="inset" />

              {/* 侧边栏内嵌区域,包含主要内容（固定视口高度，内部滚动） */}
              <SidebarInset className="flex min-h-0 flex-col h-svh md:h-[calc(100svh-1rem)]">
                {/* 网站头部 */}
                <SiteHeader />

                {/* 主内容区域：占据剩余空间，在内部滚动 */}
                <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                  {/* 
                    容器查询包装器
                    @container/main: 定义一个名为 main 的容器查询上下文
                    用于响应式设计,根据容器大小而非视口大小调整样式
                  */}
                  <div className="@container/main flex-1 min-h-0 flex flex-col gap-2">
                    {/* 使用 Suspense 只包裹页面内容,避免影响侧边栏和头部 */}
                    <Suspense fallback={<LoadingState message="页面加载中..." />}>
                      {children}
                    </Suspense>
                    <Toaster />
                  </div>
                </div>
              </SidebarInset>
            </SidebarProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
