"use client" // 标记为客户端组件，可以使用浏览器 API 和交互功能

// 导入 React 库
import * as React from "react"
// 导入 Recharts 图表组件
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

// 导入移动端检测 Hook
import { useIsMobile } from '@/hooks/use-mobile'
// 导入卡片相关 UI 组件
import {
  Card,         // 卡片容器
  CardAction,   // 卡片操作区域
  CardContent,  // 卡片内容区域
  CardDescription, // 卡片描述
  CardHeader,   // 卡片头部
  CardTitle,    // 卡片标题
} from '@/components/ui/card'
// 导入图表相关 UI 组件
import {
  ChartConfig,        // 图表配置类型
  ChartContainer,     // 图表容器
  ChartTooltip,       // 图表提示框
  ChartTooltipContent, // 图表提示框内容
} from '@/components/ui/chart'
// 导入选择器 UI 组件
import {
  Select,         // 选择器
  SelectContent,  // 选择器内容
  SelectItem,     // 选择器选项
  SelectTrigger,  // 选择器触发器
  SelectValue,    // 选择器值显示
} from '@/components/ui/select'
// 导入切换组 UI 组件
import {
  ToggleGroup,     // 切换组容器
  ToggleGroupItem, // 切换组选项
} from '@/components/ui/toggle-group'

// 组件描述
export const description = "An interactive area chart" // 交互式区域图表

// 图表数据 - 包含桌面端和移动端访问量的时间序列数据
const chartData = [
  { date: "2024-04-01", desktop: 222, mobile: 150 },
  { date: "2024-04-02", desktop: 97, mobile: 180 },
  { date: "2024-04-03", desktop: 167, mobile: 120 },
  { date: "2024-04-04", desktop: 242, mobile: 260 },
  { date: "2024-04-05", desktop: 373, mobile: 290 },
  { date: "2024-04-06", desktop: 301, mobile: 340 },
  { date: "2024-04-07", desktop: 245, mobile: 180 },
  { date: "2024-04-08", desktop: 409, mobile: 320 },
  { date: "2024-04-09", desktop: 59, mobile: 110 },
  { date: "2024-04-10", desktop: 261, mobile: 190 },
  { date: "2024-04-11", desktop: 327, mobile: 350 },
  { date: "2024-04-12", desktop: 292, mobile: 210 },
  { date: "2024-04-13", desktop: 342, mobile: 380 },
  { date: "2024-04-14", desktop: 137, mobile: 220 },
  { date: "2024-04-15", desktop: 120, mobile: 170 },
  { date: "2024-04-16", desktop: 138, mobile: 190 },
  { date: "2024-04-17", desktop: 446, mobile: 360 },
  { date: "2024-04-18", desktop: 364, mobile: 410 },
  { date: "2024-04-19", desktop: 243, mobile: 180 },
  { date: "2024-04-20", desktop: 89, mobile: 150 },
  { date: "2024-04-21", desktop: 137, mobile: 200 },
  { date: "2024-04-22", desktop: 224, mobile: 170 },
  { date: "2024-04-23", desktop: 138, mobile: 230 },
  { date: "2024-04-24", desktop: 387, mobile: 290 },
  { date: "2024-04-25", desktop: 215, mobile: 250 },
  { date: "2024-04-26", desktop: 75, mobile: 130 },
  { date: "2024-04-27", desktop: 383, mobile: 420 },
  { date: "2024-04-28", desktop: 122, mobile: 180 },
  { date: "2024-04-29", desktop: 315, mobile: 240 },
  { date: "2024-04-30", desktop: 454, mobile: 380 },
  { date: "2024-05-01", desktop: 165, mobile: 220 },
  { date: "2024-05-02", desktop: 293, mobile: 310 },
  { date: "2024-05-03", desktop: 247, mobile: 190 },
  { date: "2024-05-04", desktop: 385, mobile: 420 },
  { date: "2024-05-05", desktop: 481, mobile: 390 },
  { date: "2024-05-06", desktop: 498, mobile: 520 },
  { date: "2024-05-07", desktop: 388, mobile: 300 },
  { date: "2024-05-08", desktop: 149, mobile: 210 },
  { date: "2024-05-09", desktop: 227, mobile: 180 },
  { date: "2024-05-10", desktop: 293, mobile: 330 },
  { date: "2024-05-11", desktop: 335, mobile: 270 },
  { date: "2024-05-12", desktop: 197, mobile: 240 },
  { date: "2024-05-13", desktop: 197, mobile: 160 },
  { date: "2024-05-14", desktop: 448, mobile: 490 },
  { date: "2024-05-15", desktop: 473, mobile: 380 },
  { date: "2024-05-16", desktop: 338, mobile: 400 },
  { date: "2024-05-17", desktop: 499, mobile: 420 },
  { date: "2024-05-18", desktop: 315, mobile: 350 },
  { date: "2024-05-19", desktop: 235, mobile: 180 },
  { date: "2024-05-20", desktop: 177, mobile: 230 },
  { date: "2024-05-21", desktop: 82, mobile: 140 },
  { date: "2024-05-22", desktop: 81, mobile: 120 },
  { date: "2024-05-23", desktop: 252, mobile: 290 },
  { date: "2024-05-24", desktop: 294, mobile: 220 },
  { date: "2024-05-25", desktop: 201, mobile: 250 },
  { date: "2024-05-26", desktop: 213, mobile: 170 },
  { date: "2024-05-27", desktop: 420, mobile: 460 },
  { date: "2024-05-28", desktop: 233, mobile: 190 },
  { date: "2024-05-29", desktop: 78, mobile: 130 },
  { date: "2024-05-30", desktop: 340, mobile: 280 },
  { date: "2024-05-31", desktop: 178, mobile: 230 },
  { date: "2024-06-01", desktop: 178, mobile: 200 },
  { date: "2024-06-02", desktop: 470, mobile: 410 },
  { date: "2024-06-03", desktop: 103, mobile: 160 },
  { date: "2024-06-04", desktop: 439, mobile: 380 },
  { date: "2024-06-05", desktop: 88, mobile: 140 },
  { date: "2024-06-06", desktop: 294, mobile: 250 },
  { date: "2024-06-07", desktop: 323, mobile: 370 },
  { date: "2024-06-08", desktop: 385, mobile: 320 },
  { date: "2024-06-09", desktop: 438, mobile: 480 },
  { date: "2024-06-10", desktop: 155, mobile: 200 },
  { date: "2024-06-11", desktop: 92, mobile: 150 },
  { date: "2024-06-12", desktop: 492, mobile: 420 },
  { date: "2024-06-13", desktop: 81, mobile: 130 },
  { date: "2024-06-14", desktop: 426, mobile: 380 },
  { date: "2024-06-15", desktop: 307, mobile: 350 },
  { date: "2024-06-16", desktop: 371, mobile: 310 },
  { date: "2024-06-17", desktop: 475, mobile: 520 },
  { date: "2024-06-18", desktop: 107, mobile: 170 },
  { date: "2024-06-19", desktop: 341, mobile: 290 },
  { date: "2024-06-20", desktop: 408, mobile: 450 },
  { date: "2024-06-21", desktop: 169, mobile: 210 },
  { date: "2024-06-22", desktop: 317, mobile: 270 },
  { date: "2024-06-23", desktop: 480, mobile: 530 },
  { date: "2024-06-24", desktop: 132, mobile: 180 },
  { date: "2024-06-25", desktop: 141, mobile: 190 },
  { date: "2024-06-26", desktop: 434, mobile: 380 },
  { date: "2024-06-27", desktop: 448, mobile: 490 },
  { date: "2024-06-28", desktop: 149, mobile: 200 },
  { date: "2024-06-29", desktop: 103, mobile: 160 },
  { date: "2024-06-30", desktop: 446, mobile: 400 },
]

// 图表配置 - 定义图表中各数据系列的标签和颜色
const chartConfig = {
  visitors: {
    label: "Visitors", // 访客
  },
  desktop: {
    label: "Desktop", // 桌面端
    color: "var(--primary)", // 使用主题色
  },
  mobile: {
    label: "Mobile", // 移动端
    color: "var(--primary)", // 使用主题色
  },
} satisfies ChartConfig

/**
 * 交互式区域图表组件
 * 
 * 功能:
 * 1. 显示桌面端和移动端访问量的时间趋势
 * 2. 支持时间范围切换（7天、30天、90天）
 * 3. 响应式设计，移动端自动切换到7天视图
 * 4. 支持渐变填充和交互式提示框
 */
export function ChartAreaInteractive() {
  const isMobile = useIsMobile() // 检测是否为移动端
  const [timeRange, setTimeRange] = React.useState("90d") // 时间范围状态

  // 移动端自动切换到7天视图
  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  // 根据选择的时间范围过滤数据
  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date) // 当前数据项的日期
    const referenceDate = new Date("2024-06-30") // 参考结束日期
    let daysToSubtract = 90 // 默认显示90天
    
    // 根据时间范围设置天数
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    
    // 计算开始日期
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    
    // 返回在时间范围内的数据
    return date >= startDate
  })

  return (
    // 卡片容器，支持容器查询
    <Card className="@container/card">
      {/* 卡片头部 */}
      <CardHeader>
        {/* 卡片标题 */}
        <CardTitle>Total Visitors</CardTitle> {/* 总访客数 */}
        {/* 卡片描述，响应式显示 */}
        <CardDescription>
          {/* 大屏幕显示完整描述 */}
          <span className="hidden @[540px]/card:block">
            Total for the last 3 months {/* 最近3个月总计 */}
          </span>
          {/* 小屏幕显示简化描述 */}
          <span className="@[540px]/card:hidden">Last 3 months</span> {/* 最近3个月 */}
        </CardDescription>
        {/* 卡片操作区域 */}
        <CardAction>
          {/* 时间范围切换组 - 大屏幕显示 */}
          <ToggleGroup
            type="single"                    // 单选模式
            value={timeRange}               // 当前选中值
            onValueChange={setTimeRange}    // 值变化回调
            variant="outline"               // 轮廓样式
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex" // 大屏显示
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem> {/* 最近3个月 */}
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>   {/* 最近30天 */}
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>     {/* 最近7天 */}
          </ToggleGroup>
          {/* 时间范围选择器 - 小屏幕显示 */}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden" // 小屏显示
              size="sm"                    // 小尺寸
              aria-label="Select a value" // 无障碍标签
            >
              <SelectValue placeholder="Last 3 months" /> {/* 默认占位符 */}
            </SelectTrigger>
            <SelectContent className="rounded-xl"> {/* 圆角下拉内容 */}
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months {/* 最近3个月 */}
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days {/* 最近30天 */}
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days {/* 最近7天 */}
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      {/* 卡片内容区域 */}
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6"> {/* 响应式内边距 */}
        {/* 图表容器 */}
        <ChartContainer
          config={chartConfig}                    // 图表配置
          className="aspect-auto h-[250px] w-full" // 自动宽高比，固定高度
        >
          {/* 区域图表组件 */}
          <AreaChart data={filteredData}> {/* 使用过滤后的数据 */}
            {/* 定义渐变填充 */}
            <defs>
              {/* 桌面端渐变 */}
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"                        // 渐变起始位置
                  stopColor="var(--color-desktop)"   // 桌面端颜色
                  stopOpacity={1.0}                  // 完全不透明
                />
                <stop
                  offset="95%"                       // 渐变结束位置
                  stopColor="var(--color-desktop)"   // 桌面端颜色
                  stopOpacity={0.1}                  // 几乎透明
                />
              </linearGradient>
              {/* 移动端渐变 */}
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"                       // 渐变起始位置
                  stopColor="var(--color-mobile)"   // 移动端颜色
                  stopOpacity={0.8}                 // 半透明
                />
                <stop
                  offset="95%"                      // 渐变结束位置
                  stopColor="var(--color-mobile)"   // 移动端颜色
                  stopOpacity={0.1}                 // 几乎透明
                />
              </linearGradient>
            </defs>
            {/* 网格线 - 只显示水平线 */}
            <CartesianGrid vertical={false} />
            {/* X轴配置 */}
            <XAxis
              dataKey="date"        // 数据键为日期
              tickLine={false}      // 不显示刻度线
              axisLine={false}      // 不显示轴线
              tickMargin={8}        // 刻度标签边距
              minTickGap={32}       // 最小刻度间隔
              tickFormatter={(value) => { // 自定义刻度格式化
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",     // 短月份名
                  day: "numeric",     // 数字日期
                })
              }}
            />
            {/* 图表提示框 */}
            <ChartTooltip
              cursor={false}        // 不显示鼠标跟随线
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => { // 标签格式化函数
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",     // 短月份名
                      day: "numeric",     // 数字日期
                    })
                  }}
                  indicator="dot"       // 使用点状指示器
                />
              }
            />
            {/* 移动端区域 */}
            <Area
              dataKey="mobile"              // 数据键
              type="natural"                // 自然曲线类型
              fill="url(#fillMobile)"       // 使用移动端渐变填充
              stroke="var(--color-mobile)"  // 边框颜色
              stackId="a"                   // 堆叠ID，用于堆叠显示
            />
            {/* 桌面端区域 */}
            <Area
              dataKey="desktop"             // 数据键
              type="natural"                // 自然曲线类型
              fill="url(#fillDesktop)"      // 使用桌面端渐变填充
              stroke="var(--color-desktop)" // 边框颜色
              stackId="a"                   // 堆叠ID，用于堆叠显示
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
