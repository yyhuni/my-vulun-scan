"use client"

import { type Icon } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { Link, usePathname } from "@/i18n/navigation"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSystem({
  items,
}: {
  items: {
    name: string
    url: string
    icon: Icon
  }[]
}) {
  const pathname = usePathname()
  const tNav = useTranslations("navigation")
  const normalize = (p: string) => (p !== "/" && p.endsWith("/") ? p.slice(0, -1) : p)
  const current = normalize(pathname)

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{tNav("settings")}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const navUrl = normalize(item.url)
          const isActive = current === navUrl || current.startsWith(navUrl + "/")

          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild isActive={isActive}>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
