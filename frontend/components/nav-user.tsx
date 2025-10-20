"use client" // 标记为客户端组件，可以使用浏览器 API 和交互功能

// 导入图标组件
import {
  IconCreditCard,    // 信用卡图标
  IconDotsVertical,  // 垂直三点图标
  IconLogout,        // 登出图标
  IconNotification,  // 通知图标
  IconUserCircle,    // 用户圆圈图标
} from "@tabler/icons-react"

// 导入头像相关组件
import {
  Avatar,        // 头像容器
  AvatarFallback, // 头像备用显示
  AvatarImage,   // 头像图片
} from '@/components/ui/avatar'
// 导入下拉菜单相关组件
import {
  DropdownMenu,          // 下拉菜单容器
  DropdownMenuContent,   // 下拉菜单内容
  DropdownMenuGroup,     // 下拉菜单组
  DropdownMenuItem,      // 下拉菜单项
  DropdownMenuLabel,     // 下拉菜单标签
  DropdownMenuSeparator, // 下拉菜单分隔线
  DropdownMenuTrigger,   // 下拉菜单触发器
} from '@/components/ui/dropdown-menu'
// 导入侧边栏相关组件
import {
  SidebarMenu,       // 侧边栏菜单
  SidebarMenuButton, // 侧边栏菜单按钮
  SidebarMenuItem,   // 侧边栏菜单项
  useSidebar,        // 侧边栏Hook
} from '@/components/ui/sidebar'

/**
 * 用户导航组件
 * 显示用户信息和用户相关的操作菜单
 * 
 * @param {Object} props - 组件属性
 * @param {Object} props.user - 用户信息
 * @param {string} props.user.name - 用户名称
 * @param {string} props.user.email - 用户邮箱
 * @param {string} props.user.avatar - 用户头像URL
 */
export function NavUser({
  user,
}: {
  user: {
    name: string   // 用户名称
    email: string  // 用户邮箱
    avatar: string // 用户头像URL
  }
}) {
  const { isMobile } = useSidebar() // 获取移动端状态

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* 用户下拉菜单 */}
        <DropdownMenu>
          {/* 下拉菜单触发器 */}
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"                                                    // 大尺寸
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground" // 打开时的样式
            >
              {/* 用户头像 */}
              <Avatar className="h-8 w-8 rounded-lg grayscale">         {/* 8x8尺寸，圆角，灰度 */}
                <AvatarImage src={user.avatar} alt={user.name} />       {/* 用户头像图片 */}
                <AvatarFallback className="rounded-lg">CN</AvatarFallback> {/* 备用显示 */}
              </Avatar>
              {/* 用户信息区域 */}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>  {/* 用户名称 */}
                <span className="text-muted-foreground truncate text-xs">  {/* 用户邮箱 */}
                  {user.email}
                </span>
              </div>
              {/* 三点菜单图标 */}
              <IconDotsVertical className="ml-auto size-4" />           {/* 自动左边距，4x4尺寸 */}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          {/* 下拉菜单内容 */}
          <DropdownMenuContent
            className="rounded-lg"                                     // 圆角
            side={isMobile ? "bottom" : "right"}                        // 移动端下方，桌面端右侧
            align="end"                                                 // 端对齐
            sideOffset={4}                                             // 偏移4像素
          >
            {/* 用户信息标签 */}
            <DropdownMenuLabel className="p-0 font-normal">           {/* 无内边距，正常字体 */}
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                {/* 用户头像 */}
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />     {/* 用户头像图片 */}
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback> {/* 备用显示 */}
                </Avatar>
                {/* 用户信息 */}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>  {/* 用户名称 */}
                  <span className="text-muted-foreground truncate text-xs">  {/* 用户邮箱 */}
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            {/* 分隔线 */}
            <DropdownMenuSeparator />
            {/* 用户操作组 */}
            <DropdownMenuGroup>
              {/* 账户设置 */}
              <DropdownMenuItem>
                <IconUserCircle />                                       {/* 用户圆圈图标 */}
                Account                                                  {/* 账户 */}
              </DropdownMenuItem>
              {/* 账单设置 */}
              <DropdownMenuItem>
                <IconCreditCard />                                       {/* 信用卡图标 */}
                Billing                                                  {/* 账单 */}
              </DropdownMenuItem>
              {/* 通知设置 */}
              <DropdownMenuItem>
                <IconNotification />                                     {/* 通知图标 */}
                Notifications                                            {/* 通知 */}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {/* 分隔线 */}
            <DropdownMenuSeparator />
            {/* 登出选项 */}
            <DropdownMenuItem>
              <IconLogout />                                             {/* 登出图标 */}
              Log out                                                    {/* 登出 */}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
