"use client" // 标记为客户端组件，可以使用浏览器 API 和交互功能

// 导入图标组件
import { IconCirclePlusFilled, IconMail, type Icon } from "@tabler/icons-react"

// 导入按钮组件
import { Button } from '@/components/ui/button'
// 导入侧边栏相关组件
import {
  SidebarGroup,        // 侧边栏组
  SidebarGroupContent, // 侧边栏组内容
  SidebarMenu,         // 侧边栏菜单
  SidebarMenuButton,   // 侧边栏菜单按钮
  SidebarMenuItem,     // 侧边栏菜单项
} from '@/components/ui/sidebar'

/**
 * 主导航组件
 * 显示快速创建按钮和主要导航菜单项
 * 
 * @param {Object} props - 组件属性
 * @param {Array} props.items - 导航项数组
 * @param {string} props.items[].title - 导航项标题
 * @param {string} props.items[].url - 导航项链接
 * @param {Icon} props.items[].icon - 导航项图标（可选）
 */
export function NavMain({
  items,
}: {
  items: {
    title: string  // 导航项标题
    url: string    // 导航项URL
    icon?: Icon    // 导航项图标（可选）
  }[]
}) {
  return (
    <SidebarGroup>
      {/* 侧边栏组内容，垂直排列，间距为2 */}
      <SidebarGroupContent className="flex flex-col gap-2">
        {/* 快速操作菜单 */}
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            {/* 快速创建按钮 */}
            <SidebarMenuButton
              tooltip="Quick Create"                              // 工具提示
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
            >
              <IconCirclePlusFilled />                           {/* 填充的圆形加号图标 */}
              <span>Quick Create</span>                          {/* 快速创建 */}
            </SidebarMenuButton>
            {/* 邮件按钮 */}
            <Button
              size="icon"                                        // 图标尺寸
              className="size-8 group-data-[collapsible=icon]:opacity-0" // 在图标模式下隐藏
              variant="outline"                                  // 轮廓样式
            >
              <IconMail />                                       {/* 邮件图标 */}
              <span className="sr-only">Inbox</span>            {/* 无障碍文本：收件箱 */}
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        {/* 主导航菜单 */}
        <SidebarMenu>
          {/* 遍历导航项 */}
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              {/* 导航菜单按钮 */}
              <SidebarMenuButton tooltip={item.title}>        {/* 工具提示显示标题 */}
                {item.icon && <item.icon />}                   {/* 如果有图标则显示 */}
                <span>{item.title}</span>                     {/* 导航项标题 */}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
