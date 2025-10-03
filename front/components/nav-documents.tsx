"use client" // 标记为客户端组件，可以使用浏览器 API 和交互功能

// 导入图标组件
import {
  IconDots,    // 三点图标
  IconFolder,  // 文件夹图标
  IconShare3,  // 分享图标
  IconTrash,   // 垃圾箱图标
  type Icon,   // 图标类型
} from "@tabler/icons-react"

// 导入下拉菜单相关组件
import {
  DropdownMenu,          // 下拉菜单容器
  DropdownMenuContent,   // 下拉菜单内容
  DropdownMenuItem,      // 下拉菜单项
  DropdownMenuSeparator, // 下拉菜单分隔线
  DropdownMenuTrigger,   // 下拉菜单触发器
} from '@/components/ui/dropdown-menu'
// 导入侧边栏相关组件
import {
  SidebarGroup,       // 侧边栏组
  SidebarGroupLabel,  // 侧边栏组标签
  SidebarMenu,        // 侧边栏菜单
  SidebarMenuAction,  // 侧边栏菜单操作
  SidebarMenuButton,  // 侧边栏菜单按钮
  SidebarMenuItem,    // 侧边栏菜单项
  useSidebar,         // 侧边栏Hook
} from '@/components/ui/sidebar'

/**
 * 文档导航组件
 * 显示文档相关的导航菜单，包含操作下拉菜单
 * 
 * @param {Object} props - 组件属性
 * @param {Array} props.items - 文档项数组
 * @param {string} props.items[].name - 文档名称
 * @param {string} props.items[].url - 文档链接
 * @param {Icon} props.items[].icon - 文档图标
 */
export function NavDocuments({
  items,
}: {
  items: {
    name: string  // 文档名称
    url: string   // 文档URL
    icon: Icon    // 文档图标
  }[]
}) {
  const { isMobile } = useSidebar() // 获取移动端状态

  return (
    // 侧边栏组，在图标模式下隐藏
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      {/* 组标签 */}
      <SidebarGroupLabel>Documents</SidebarGroupLabel> {/* 文档 */}
      {/* 侧边栏菜单 */}
      <SidebarMenu>
        {/* 遍历文档项 */}
        {items.map((item) => (
          <SidebarMenuItem key={item.name}>
            {/* 文档链接按钮 */}
            <SidebarMenuButton asChild>
              <a href={item.url}>
                <item.icon />              {/* 文档图标 */}
                <span>{item.name}</span>   {/* 文档名称 */}
              </a>
            </SidebarMenuButton>
            {/* 操作下拉菜单 */}
            <DropdownMenu>
              {/* 下拉菜单触发器 */}
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction
                  showOnHover                                      // 鼠标悬停时显示
                  className="data-[state=open]:bg-accent rounded-sm" // 打开时的背景色
                >
                  <IconDots />                                     {/* 三点图标 */}
                  <span className="sr-only">More</span>           {/* 无障碍文本 */}
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              {/* 下拉菜单内容 */}
              <DropdownMenuContent
                className="w-24 rounded-lg"                      // 宽度和圆角
                side={isMobile ? "bottom" : "right"}             // 移动端下方，桌面端右侧
                align={isMobile ? "end" : "start"}               // 对齐方式
              >
                {/* 打开选项 */}
                <DropdownMenuItem>
                  <IconFolder />                                   {/* 文件夹图标 */}
                  <span>Open</span>                               {/* 打开 */}
                </DropdownMenuItem>
                {/* 分享选项 */}
                <DropdownMenuItem>
                  <IconShare3 />                                   {/* 分享图标 */}
                  <span>Share</span>                              {/* 分享 */}
                </DropdownMenuItem>
                {/* 分隔线 */}
                <DropdownMenuSeparator />
                {/* 删除选项（危险操作） */}
                <DropdownMenuItem variant="destructive">
                  <IconTrash />                                    {/* 垃圾箱图标 */}
                  <span>Delete</span>                             {/* 删除 */}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        {/* 更多选项按钮 */}
        <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70"> {/* 半透明文本 */}
            <IconDots className="text-sidebar-foreground/70" />       {/* 三点图标 */}
            <span>More</span>                                         {/* 更多 */}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
