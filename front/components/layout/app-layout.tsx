"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import type { ReactNode } from "react"
import { AppSidebar, navigationItems } from "./app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserIcon } from "lucide-react"
import React from "react"
import Link from "next/link"


interface BreadcrumbItemType {
  name: string
  href?: string
  current?: boolean
}

interface AppLayoutProps {
  children: ReactNode
  breadcrumbItems?: BreadcrumbItemType[]
  noPadding?: boolean
}

// 根据路径获取面包屑
const getPathToBreadcrumb = (pathname: string): BreadcrumbItemType[] => {
  const breadcrumbs: BreadcrumbItemType[] = []
  
  // 查找主菜单项
  for (const item of navigationItems) {
    if (item.href === pathname) {
      // 完全匹配主菜单项
      breadcrumbs.push({ name: item.name, current: true })
      return breadcrumbs
    } else if (pathname.startsWith(item.href) && item.href !== "/") {
      // 部分匹配，先添加主菜单项
      breadcrumbs.push({ name: item.name, href: item.href })
      
      // 查找子菜单项
      if (item.subItems) {
        for (const subItem of item.subItems) {
          if (subItem.href === pathname) {
            breadcrumbs.push({ name: subItem.name, current: true })
            return breadcrumbs
          }
        }
      }
      
      // 如果没找到匹配的子菜单，但路径匹配主菜单，标记主菜单为当前
      if (breadcrumbs.length === 1) {
        breadcrumbs[0].current = true
        breadcrumbs[0].href = undefined
      }
      return breadcrumbs
    }
  }
  
  // 如果没有找到匹配项，返回默认面包屑
  if (pathname === "/") {
    return [{ name: "仪表盘", current: true }]
  }
  
  return [{ name: "未知页面", current: true }]
}

// 内部组件，用于在 SidebarProvider 内部使用 useSidebar hook
function AppLayoutContent({ children, breadcrumbItems, noPadding }: { 
  children: ReactNode
  breadcrumbItems: BreadcrumbItemType[]
  noPadding: boolean
}) {
  const pathname = usePathname()
  const { setOpen } = useSidebar()
  const hasAutoCollapsedRef = useRef(false)

  // 检测工作流编辑页面，仅在首次进入时自动收起侧边栏
  useEffect(() => {
    if (pathname === '/workflow/edit' && !hasAutoCollapsedRef.current) {
      setOpen(false)
      hasAutoCollapsedRef.current = true
    } else if (pathname !== '/workflow/edit') {
      // 离开工作流编辑页面时重置标记，以便下次进入时能再次自动收起
      hasAutoCollapsedRef.current = false
    }
  }, [pathname, setOpen])

  return (
    <>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/" className="font-normal">
                  首页
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbItems.map((item, index) => (
                <React.Fragment key={index}>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    {item.current ? (
                      <BreadcrumbPage>{item.name}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={item.href || '#'} className="font-normal">
                        {item.name}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>
                <UserIcon className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <div className={`flex-1 min-h-0 ${noPadding ? '' : 'flex flex-col gap-4 p-4'}`}>
          {children}
        </div>
      </SidebarInset>
    </>
  )
}

export default function AppLayout({
  children,
  breadcrumbItems: customBreadcrumbItems,
  noPadding = false
}: AppLayoutProps) {
  const pathname = usePathname()
  const breadcrumbItems = customBreadcrumbItems || getPathToBreadcrumb(pathname)

  const content = (
    <SidebarProvider>
      <AppLayoutContent
        children={children}
        breadcrumbItems={breadcrumbItems}
        noPadding={noPadding}
      />
    </SidebarProvider>
  )

  // 直接返回内容，让 Next.js 原生机制处理 loading
  return content
}


