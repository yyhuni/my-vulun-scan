import type React from "react"
// 导入应用侧边栏组件
import { AppSidebar } from "@/components/app-sidebar"
// 导入交互式区域图表组件
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
// 导入数据表格组件
import { DataTable } from "@/components/data-table"
// 导入卡片区域组件
import { SectionCards } from "@/components/section-cards"
// 导入网站头部组件
import { SiteHeader } from "@/components/site-header"
// 导入侧边栏相关的 UI 组件
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

// 导入仪表板数据
import data from "./data.json"

/**
 * 仪表板页面组件
 * 这是应用的主要仪表板页面,包含侧边栏、头部、卡片、图表和数据表格
 */
export default function Page() {
  return (
    // SidebarProvider 提供侧边栏的上下文状态管理
    <SidebarProvider
      // 自定义 CSS 变量,设置侧边栏宽度和头部高度
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)", // 侧边栏宽度为 72 个间距单位
          "--header-height": "calc(var(--spacing) * 12)", // 头部高度为 12 个间距单位
        } as React.CSSProperties
      }
    >
      {/* 应用侧边栏,使用 inset 变体样式 */}
      <AppSidebar variant="inset" />

      {/* 侧边栏内嵌区域,包含主要内容 */}
      <SidebarInset>
        {/* 网站头部 */}
        <SiteHeader />

        {/* 主内容区域,使用 flex 布局垂直排列 */}
        <div className="flex flex-1 flex-col">
          {/* 
            容器查询包装器
            @container/main: 定义一个名为 main 的容器查询上下文
            用于响应式设计,根据容器大小而非视口大小调整样式
          */}
          <div className="@container/main flex flex-1 flex-col gap-2">
            {/* 内容区域,包含卡片、图表和数据表格 */}
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* 卡片区域组件 */}
              <SectionCards />

              {/* 图表区域,带有水平内边距 */}
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>

              {/* 数据表格组件,传入 JSON 数据 */}
              <DataTable data={data} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
