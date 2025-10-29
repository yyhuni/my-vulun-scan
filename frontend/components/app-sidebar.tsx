"use client" // 标记为客户端组件,可以使用浏览器 API 和交互功能

// 导入 React 库
import type * as React from "react"
// 导入 Tabler Icons 图标库中的各种图标
import {
  IconCamera, // 相机图标
  IconChartBar, // 柱状图图标
  IconDashboard, // 仪表板图标
  IconDatabase, // 数据库图标
  IconFileAi, // AI 文件图标
  IconFileDescription, // 文件描述图标
  IconFileWord, // Word 文件图标
  IconFolder, // 文件夹图标
  IconHelp, // 帮助图标
  IconInnerShadowTop, // 内阴影图标
  IconListDetails, // 列表详情图标
  IconReport, // 报告图标
  IconSearch, // 搜索图标
  IconSettings, // 设置图标
  IconUsers, // 用户图标
  IconChevronRight, // 右箭头图标
  IconRadar, // 雷达扫描图标
  IconTool, // 工具图标
} from "@tabler/icons-react"
// 导入路径名 hook
import { usePathname } from "next/navigation"
// 导入 Link 组件
import Link from "next/link"

// 导入自定义导航组件
import { NavSystem } from "@/components/nav-system"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
// 导入侧边栏 UI 组件
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
// 导入折叠组件
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// 定义导航菜单项的类型
interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  items?: {
    title: string
    url: string
  }[]
}

// 定义侧边栏的数据结构
const data = {
  // 用户信息
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  // 主导航菜单项
  navMain: [
    {
      title: "仪表盘", // 仪表板
      url: "/dashboard/",
      icon: IconDashboard,
    },
    {
      title: "组织管理", // 组织管理
      url: "/organization/",
      icon: IconUsers,
    },
    {
      title: "目标管理", // 目标管理
      url: "/target/",
      icon: IconListDetails,
    },
    {
      title: "扫描管理", // 扫描管理
      url: "/scan/",
      icon: IconRadar,
      items: [
        {
          title: "新建扫描", // 新建扫描
          url: "/scan/new/",
        },
        {
          title: "扫描历史", // 扫描历史
          url: "/scan/history/",
        },
        {
          title: "定时扫描", // 定时扫描
          url: "/scan/scheduled/",
        },
        {
          title: "扫描策略", // 扫描策略
          url: "/scan/strategy/",
        },
      ],
    },
    {
      title: "工具管理", // 工具管理
      url: "/tools/",
      icon: IconTool,
      items: [
        {
          title: "工具配置", // 工具配置
          url: "/tools/config/",
        },
        {
          title: "命令管理", // 命令管理
          url: "/tools/command/",
        },
      ],
    },
  ],
  // 次要导航菜单项
  navSecondary: [
    {
      title: "Get Help", // 获取帮助
      url: "#",
      icon: IconHelp,
    },
  ],
  // 系统设置相关菜单项
  documents: [
    {
      name: "磁盘管理", // 硬盘使用情况
      url: "/disk/",
      icon: IconDatabase,
    },
    {
      name: "通知设置", // 通知设置
      url: "/settings/notifications/",
      icon: IconSettings,
    },
  ],
}

/**
 * 应用侧边栏组件
 * 显示应用的主要导航菜单,包括用户信息、主菜单、文档和次要菜单
 * 支持子菜单的展开和折叠功能
 * @param props - Sidebar 组件的所有属性
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const normalize = (p: string) => (p !== "/" && p.endsWith("/") ? p.slice(0, -1) : p)
  const current = normalize(pathname)

  return (
    // collapsible="offcanvas" 表示侧边栏可以折叠为画布外模式
    <Sidebar collapsible="offcanvas" {...props}>
      {/* 侧边栏头部 */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* 
              侧边栏菜单按钮,作为链接使用
              data-[slot=sidebar-menu-button]:!p-1.5 设置内边距
            */}
            <SidebarMenuButton 
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                {/* 公司 Logo 图标 */}
                <IconInnerShadowTop className="!size-5" />
                {/* 公司名称 */}
                <span className="text-base font-semibold">XingRin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* 侧边栏主要内容区域 */}
      <SidebarContent>
        {/* 主导航菜单 */}
        <SidebarGroup>
          <SidebarGroupLabel>主要功能</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => {
                const navUrl = normalize(item.url)
                const isActive = navUrl === "/" ? current === "/" : current === navUrl || current.startsWith(navUrl + "/")
                const hasSubItems = item.items && item.items.length > 0

                if (!hasSubItems) {
                  // 无子菜单的普通菜单项
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                }

                // 有子菜单的折叠菜单项
                return (
                  <Collapsible
                    key={item.title}
                    defaultOpen={isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton isActive={isActive}>
                          <item.icon />
                          <span>{item.title}</span>
                          <IconChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={current === normalize(subItem.url)}
                              >
                                <Link href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* 系统设置导航菜单 */}
        <NavSystem items={data.documents} />
        {/* 次要导航菜单,使用 mt-auto 推到底部 */}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>

      {/* 侧边栏底部 */}
      <SidebarFooter>
        {/* 用户信息组件 */}
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
