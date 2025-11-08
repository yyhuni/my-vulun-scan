"use client"

import React, { useState } from "react"
import { toast } from "sonner"
import {
  Calendar,
  Check,
  ChevronDown,
  CircleHelp,
  Mail,
  Plus,
  Search,
  Settings,
  User,
  X,
} from "lucide-react"

// Components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function ComponentsShowcase() {
  const [progress, setProgress] = useState(60)
  const [switchChecked, setSwitchChecked] = useState(false)

  return (
    <div className="container mx-auto p-8 space-y-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">UI 组件展示</h1>
        <p className="text-muted-foreground text-lg">项目中所有 shadcn/ui 组件的完整展示</p>
      </div>

      {/* Alert */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Alert - 警告提示</h2>
        <div className="grid gap-4">
          <Alert>
            <CircleHelp className="h-4 w-4" />
            <AlertTitle>提示</AlertTitle>
            <AlertDescription>这是一条默认的警告提示信息。</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <X className="h-4 w-4" />
            <AlertTitle>错误</AlertTitle>
            <AlertDescription>操作失败，请稍后重试。</AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Avatar */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Avatar - 头像</h2>
        <div className="flex gap-4 items-center">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>YY</AvatarFallback>
          </Avatar>
          <Avatar className="h-16 w-16">
            <AvatarFallback>XR</AvatarFallback>
          </Avatar>
        </div>
      </section>

      {/* Badge */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Badge - 徽章</h2>
        <div className="flex gap-2 flex-wrap">
          <Badge>默认</Badge>
          <Badge variant="secondary">次要</Badge>
          <Badge variant="destructive">危险</Badge>
          <Badge variant="outline">轮廓</Badge>
          <Badge className="bg-chart-4 text-white border-transparent">成功</Badge>
          <Badge className="bg-chart-3 text-white border-transparent">警告</Badge>
        </div>
      </section>

      {/* Button */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Button - 按钮</h2>
        <div className="flex gap-2 flex-wrap">
          <Button>默认按钮</Button>
          <Button variant="secondary">次要按钮</Button>
          <Button variant="destructive">危险按钮</Button>
          <Button variant="outline">轮廓按钮</Button>
          <Button variant="ghost">幽灵按钮</Button>
          <Button variant="link">链接按钮</Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm">小号</Button>
          <Button size="default">默认</Button>
          <Button size="lg">大号</Button>
          <Button size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button disabled>禁用状态</Button>
          <Button>
            <Mail className="mr-2 h-4 w-4" /> 带图标
          </Button>
        </div>
      </section>

      {/* Card */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Card - 卡片</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>卡片标题</CardTitle>
              <CardDescription>这是卡片的描述文字。</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">卡片的主要内容区域，可以放置任何内容。</p>
            </CardContent>
            <CardFooter>
              <Button>操作按钮</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>组织统计</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">总数</span>
                <span className="font-semibold">45</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">活跃</span>
                <span className="font-semibold">32</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Checkbox */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Checkbox - 复选框</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="terms1" />
            <Label htmlFor="terms1">接受条款和条件</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="terms2" defaultChecked />
            <Label htmlFor="terms2">已选中</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="terms3" disabled />
            <Label htmlFor="terms3">禁用状态</Label>
          </div>
        </div>
      </section>

      {/* Input */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Input - 输入框</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" type="email" placeholder="example@domain.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input id="password" type="password" placeholder="输入密码" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="disabled">禁用状态</Label>
            <Input id="disabled" disabled placeholder="不可编辑" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="search">搜索</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input id="search" placeholder="搜索..." className="pl-8" />
            </div>
          </div>
        </div>
      </section>

      {/* Textarea */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Textarea - 文本域</h2>
        <div className="space-y-2">
          <Label htmlFor="description">描述</Label>
          <Textarea id="description" placeholder="请输入描述信息..." rows={4} />
        </div>
      </section>

      {/* Select */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Select - 选择器</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>选择框架</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="选择一个框架" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next">Next.js</SelectItem>
                <SelectItem value="react">React</SelectItem>
                <SelectItem value="vue">Vue</SelectItem>
                <SelectItem value="svelte">Svelte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>选择状态</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="running">运行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Radio Group */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Radio Group - 单选按钮组</h2>
        <RadioGroup defaultValue="option1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option1" id="option1" />
            <Label htmlFor="option1">选项 1</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option2" id="option2" />
            <Label htmlFor="option2">选项 2</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option3" id="option3" />
            <Label htmlFor="option3">选项 3</Label>
          </div>
        </RadioGroup>
      </section>

      {/* Switch */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Switch - 开关</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch id="switch1" checked={switchChecked} onCheckedChange={setSwitchChecked} />
            <Label htmlFor="switch1">开关状态: {switchChecked ? "开" : "关"}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="switch2" defaultChecked />
            <Label htmlFor="switch2">默认开启</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="switch3" disabled />
            <Label htmlFor="switch3">禁用状态</Label>
          </div>
        </div>
      </section>

      {/* Progress */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Progress - 进度条</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>进度: {progress}%</span>
              <div className="space-x-2">
                <Button size="sm" variant="outline" onClick={() => setProgress(Math.max(0, progress - 10))}>
                  -10%
                </Button>
                <Button size="sm" variant="outline" onClick={() => setProgress(Math.min(100, progress + 10))}>
                  +10%
                </Button>
              </div>
            </div>
            <Progress value={progress} />
          </div>
          <Progress value={33} />
          <Progress value={75} />
        </div>
      </section>

      {/* Separator */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Separator - 分割线</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm">上方内容</p>
            <Separator className="my-4" />
            <p className="text-sm">下方内容</p>
          </div>
          <div className="flex h-5 items-center space-x-4 text-sm">
            <div>项目 1</div>
            <Separator orientation="vertical" />
            <div>项目 2</div>
            <Separator orientation="vertical" />
            <div>项目 3</div>
          </div>
        </div>
      </section>

      {/* Skeleton */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Skeleton - 骨架屏</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </section>

      {/* Table */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Table - 表格</h2>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>组织名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">资产数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">技术部门</TableCell>
                <TableCell>内部</TableCell>
                <TableCell>
                  <Badge className="bg-chart-4 text-white border-transparent">活跃</Badge>
                </TableCell>
                <TableCell className="text-right">125</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">市场部门</TableCell>
                <TableCell>内部</TableCell>
                <TableCell>
                  <Badge className="bg-chart-4 text-white border-transparent">活跃</Badge>
                </TableCell>
                <TableCell className="text-right">87</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">外部合作方</TableCell>
                <TableCell>外部</TableCell>
                <TableCell>
                  <Badge variant="secondary">待审核</Badge>
                </TableCell>
                <TableCell className="text-right">43</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Tabs */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Tabs - 标签页</h2>
        <Tabs defaultValue="account" className="w-full">
          <TabsList>
            <TabsTrigger value="account">账户</TabsTrigger>
            <TabsTrigger value="password">密码</TabsTrigger>
            <TabsTrigger value="settings">设置</TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">账户信息和个人资料设置。</p>
            <Input placeholder="用户名" />
            <Input type="email" placeholder="邮箱" />
          </TabsContent>
          <TabsContent value="password" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">修改您的账户密码。</p>
            <Input type="password" placeholder="当前密码" />
            <Input type="password" placeholder="新密码" />
          </TabsContent>
          <TabsContent value="settings" className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">系统设置和偏好配置。</p>
            <div className="flex items-center justify-between">
              <Label>接收通知</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label>暗色模式</Label>
              <Switch />
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* Toggle & Toggle Group */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Toggle - 切换按钮</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Toggle>切换</Toggle>
            <Toggle defaultPressed>已按下</Toggle>
            <Toggle disabled>禁用</Toggle>
          </div>
          <ToggleGroup type="single">
            <ToggleGroupItem value="left">左对齐</ToggleGroupItem>
            <ToggleGroupItem value="center">居中</ToggleGroupItem>
            <ToggleGroupItem value="right">右对齐</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </section>

      {/* Tooltip */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Tooltip - 工具提示</h2>
        <TooltipProvider>
          <div className="flex gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">悬停查看</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>这是一个工具提示</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline">
                  <CircleHelp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>点击获取帮助</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </section>

      {/* Collapsible */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Collapsible - 折叠面板</h2>
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              点击展开/收起
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground">
              这是折叠面板的内容区域。可以放置任何内容，包括表单、列表或其他组件。
            </p>
          </CollapsibleContent>
        </Collapsible>
      </section>

      {/* Scroll Area */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Scroll Area - 滚动区域</h2>
        <ScrollArea className="h-48 border rounded-lg p-4">
          <div className="space-y-2">
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="text-sm">
                滚动项目 {i + 1} - 这是一个可滚动区域的示例内容
              </div>
            ))}
          </div>
        </ScrollArea>
      </section>

      {/* Dialog */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Dialog - 对话框</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>打开对话框</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>对话框标题</DialogTitle>
              <DialogDescription>这是对话框的描述文字，说明对话框的用途。</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">名称</Label>
                <Input id="name" placeholder="输入名称" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input id="email" type="email" placeholder="输入邮箱" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">取消</Button>
              <Button>确认</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {/* Alert Dialog */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Alert Dialog - 警告对话框</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">删除操作</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除？</AlertDialogTitle>
              <AlertDialogDescription>
                此操作无法撤销。这将永久删除您的数据并从我们的服务器中移除。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction>确认删除</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      {/* Sheet */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Sheet - 抽屉</h2>
        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">从右侧打开</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>抽屉标题</SheetTitle>
                <SheetDescription>这是抽屉的描述文字。</SheetDescription>
              </SheetHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>设置项 1</Label>
                  <Input placeholder="输入值" />
                </div>
                <div className="space-y-2">
                  <Label>设置项 2</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="选择选项" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">选项 1</SelectItem>
                      <SelectItem value="2">选项 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </section>

      {/* Dropdown Menu */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Dropdown Menu - 下拉菜单</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">打开菜单</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>我的账户</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              个人资料
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              设置
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Calendar className="mr-2 h-4 w-4" />
              日历
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">退出登录</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      {/* Toast */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Toast - 提示通知</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => toast("这是一条普通消息")}>
            默认
          </Button>
          <Button variant="outline" onClick={() => toast.success("操作成功！")}>
            成功
          </Button>
          <Button variant="outline" onClick={() => toast.error("操作失败！")}>
            错误
          </Button>
          <Button variant="outline" onClick={() => toast.warning("警告信息")}>
            警告
          </Button>
          <Button variant="outline" onClick={() => toast.info("提示信息")}>
            信息
          </Button>
        </div>
      </section>

      {/* Footer */}
      <div className="pt-8 text-center text-sm text-muted-foreground">
        <p>以上展示了项目中所有可用的 UI 组件</p>
      </div>
    </div>
  )
}
