"use client"

import {
  Shield,
  LayoutDashboard,
  BarChart3,
  PenToolIcon as Tool,
  ChevronRight,
  Workflow,
} from "lucide-react"
import { usePathname } from "next/navigation"
import { useNavigation } from "@/hooks/use-navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// 导航菜单配置
export const navigationItems = [
  { name: '仪表盘', href: '/', icon: LayoutDashboard },
  {
    name: '工作流',
    href: '/workflow',
    icon: Workflow,
    subItems: [
      { name: '工作流概览', href: '/workflow/overview' },
      { name: '工作流列表', href: '/workflow/management' },
      { name: '组件库管理', href: '/workflow/components' },
    ],
  },
  {
    name: "资产管理",
    href: "/assets",
    icon: BarChart3,
    subItems: [
      { name: "资产概览", href: "/assets/overview" },
      { name: "组织列表", href: "/assets/organizations" },
    ],
  },
  {
    name: "扫描",
    href: "/scan/overview",
    icon: Shield,
    subItems: [
      { name: "扫描总览", href: "/scan/overview" },
      { name: "新建扫描", href: "/scan/create" },
      { name: "扫描历史", href: "/scan/history" },
      { name: "扫描配置", href: "/scan/config" },
      { name: "扫描工具", href: "/scan/tools" },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { navigate } = useNavigation()

  return (
    <Sidebar collapsible="icon">
      {/* 顶部品牌区 */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => navigate("/")}
              className="cursor-pointer"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Shield className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Xingra</span>
                <span className="truncate text-xs">安全扫描平台</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* 主要导航区 */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航菜单</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                const hasSubItems = item.subItems && item.subItems.length > 0

                if (!hasSubItems) {
                  // 无子菜单的普通菜单项
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => navigate(item.href)}
                        className="cursor-pointer"
                      >
                        <item.icon />
                        <span>{item.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                }

                // 有子菜单的折叠菜单项
                return (
                  <Collapsible
                    key={item.name}
                    defaultOpen={isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton isActive={isActive}>
                          <item.icon />
                          <span>{item.name}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.name}>
                              <SidebarMenuSubButton
                                href={subItem.href}
                                isActive={pathname === subItem.href}
                                onClick={(e) => {
                                  e.preventDefault()
                                  navigate(subItem.href)
                                }}
                              >
                                <span>{subItem.name}</span>
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
      </SidebarContent>
    </Sidebar>
  )
} 