"use client" // Mark as client component, can use browser APIs and interactive features

// Import React library
import type * as React from "react"
// Import various icons from Tabler Icons library
import {
  IconDashboard, // Dashboard icon
  IconListDetails, // List details icon
  IconSettings, // Settings icon
  IconUsers, // Users icon
  IconChevronRight, // Right arrow icon
  IconRadar, // Radar scan icon
  IconTool, // Tool icon
  IconServer, // Server icon
  IconTerminal2, // Terminal icon
  IconBug, // Vulnerability icon
  IconSearch, // Search icon
  IconKey, // API Key icon
  IconBan, // Blacklist icon
  IconInfoCircle, // About icon
} from "@tabler/icons-react"
// Import internationalization hook
import { useTranslations } from 'next-intl'
// Import internationalization navigation components
import { Link, usePathname } from '@/i18n/navigation'

// Import custom navigation components
import { NavSystem } from "@/components/nav-system"
import { NavUser } from "@/components/nav-user"
import { AboutDialog } from "@/components/about-dialog"
// Import sidebar UI components
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
  SidebarRail,
} from "@/components/ui/sidebar"
// Import collapsible component
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

/**
 * Application sidebar component
 * Displays the main navigation menu of the application, including user info, main menu, documents and secondary menu
 * Supports expand and collapse functionality for submenus
 * @param props - All properties of the Sidebar component
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations('navigation')
  const pathname = usePathname()
  const normalize = (p: string) => (p !== "/" && p.endsWith("/") ? p.slice(0, -1) : p)
  const current = normalize(pathname)

  // User information
  const user = {
    name: "admin",
    email: "admin@admin.com",
    avatar: "",
  }

  // Main navigation menu items - using translations
  const navMain = [
    {
      title: t('dashboard'),
      url: "/dashboard/",
      icon: IconDashboard,
    },
    {
      title: t('search'),
      url: "/search/",
      icon: IconSearch,
    },
    {
      title: t('organization'),
      url: "/organization/",
      icon: IconUsers,
    },
    {
      title: t('target'),
      url: "/target/",
      icon: IconListDetails,
    },
    {
      title: t('vulnerabilities'),
      url: "/vulnerabilities/",
      icon: IconBug,
    },
    {
      title: t('scan'),
      url: "/scan/",
      icon: IconRadar,
      items: [
        {
          title: t('scanHistory'),
          url: "/scan/history/",
        },
        {
          title: t('scheduledScan'),
          url: "/scan/scheduled/",
        },
        {
          title: t('scanEngine'),
          url: "/scan/engine/",
        },
      ],
    },
    {
      title: t('tools'),
      url: "/tools/",
      icon: IconTool,
      items: [
        {
          title: t('wordlists'),
          url: "/tools/wordlists/",
        },
        {
          title: t('fingerprints'),
          url: "/tools/fingerprints/",
        },
        {
          title: t('nucleiTemplates'),
          url: "/tools/nuclei/",
        },
      ],
    },
  ]

  // System settings related menu items
  const documents = [
    {
      name: t('workers'),
      url: "/settings/workers/",
      icon: IconServer,
    },
    {
      name: t('systemLogs'),
      url: "/settings/system-logs/",
      icon: IconTerminal2,
    },
    {
      name: t('notifications'),
      url: "/settings/notifications/",
      icon: IconSettings,
    },
    {
      name: t('apiKeys'),
      url: "/settings/api-keys/",
      icon: IconKey,
    },
    {
      name: t('globalBlacklist'),
      url: "/settings/blacklist/",
      icon: IconBan,
    },
  ]

  return (
    // collapsible="icon" means the sidebar can be collapsed to icon-only mode
    <Sidebar collapsible="icon" {...props}>
      {/* Sidebar header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <IconRadar className="!size-5" />
                <span className="text-base font-semibold">XingRin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Sidebar main content area */}
      <SidebarContent>
        {/* Main navigation menu */}
        <SidebarGroup>
          <SidebarGroupLabel>{t('mainFeatures')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => {
                const navUrl = normalize(item.url)
                const isActive = navUrl === "/" ? current === "/" : current === navUrl || current.startsWith(navUrl + "/")
                const hasSubItems = item.items && item.items.length > 0

                if (!hasSubItems) {
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
                          {item.items?.map((subItem) => {
                            const subUrl = normalize(subItem.url)
                            const isSubActive = current === subUrl || current.startsWith(subUrl + "/")
                            return (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubActive}
                                >
                                  <Link href={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* System settings navigation menu */}
        <NavSystem items={documents} />
        {/* About system button */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <AboutDialog>
                  <SidebarMenuButton>
                    <IconInfoCircle />
                    <span>{t('about')}</span>
                  </SidebarMenuButton>
                </AboutDialog>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Sidebar footer */}
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
