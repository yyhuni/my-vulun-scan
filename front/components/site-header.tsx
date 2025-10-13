import { Button } from "@/components/ui/button"
// 导入分隔线组件
import { Separator } from "@/components/ui/separator"
// 导入侧边栏触发器组件
import { SidebarTrigger } from "@/components/ui/sidebar"
// 导入通知抽屉组件
import { NotificationDrawer } from "@/components/notification-drawer"
// 导入主题切换组件
import { ThemeToggle } from "@/components/theme-toggle"

/**
 * 网站头部组件
 * 显示在页面顶部,包含侧边栏切换按钮、页面标题和外部链接
 */
export function SiteHeader() {
  return (
    // header 元素,使用 flex 布局水平排列内容
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      {/* 内容容器,占据整个宽度 */}
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {/* 侧边栏切换按钮,带有负左边距以对齐 */}
        <SidebarTrigger className="-ml-1" />

        {/* 垂直分隔线,高度为 4 个单位 */}
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />

        {/* 页面标题 */}
        <h1 className="text-base font-medium">Documents</h1>

        {/* 右侧按钮区域,使用 ml-auto 推到最右边 */}
        <div className="ml-auto flex items-center gap-2">
          {/* 通知抽屉按钮 */}
          <NotificationDrawer />
          
          {/* 主题切换按钮 */}
          <ThemeToggle />
          
          {/* GitHub 链接按钮,在小屏幕上隐藏 */}
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(examples)/dashboard"
              rel="noopener noreferrer" // 安全属性,防止新窗口访问原窗口
              target="_blank" // 在新标签页打开
              className="dark:text-foreground" // 深色模式下的文字颜色
            >
              GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
