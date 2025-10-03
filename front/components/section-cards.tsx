// 导入图标组件
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

// 导入徽章组件
import { Badge } from '@/components/ui/badge'
// 导入卡片相关组件
import {
  Card,            // 卡片容器
  CardAction,      // 卡片操作区域
  CardDescription, // 卡片描述
  CardFooter,      // 卡片底部
  CardHeader,      // 卡片头部
  CardTitle,       // 卡片标题
} from '@/components/ui/card'

/**
 * 统计卡片区域组件
 * 显示关键业务指标的统计卡片，包含收入、客户、账户和增长率等数据
 * 支持响应式布局，在不同屏幕尺寸下显示不同的列数
 */
export function SectionCards() {
  return (
    // 卡片网格容器，响应式布局：1列 -> 2列 -> 4列
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* 总收入卡片 */}
      <Card className="@container/card">                              {/* 支持容器查询 */}
        <CardHeader>
          <CardDescription>Total Revenue</CardDescription>           {/* 总收入 */}
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            $1,250.00                                                {/* 收入金额，响应式字体大小 */}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">                               {/* 轮廓徽章 */}
              <IconTrendingUp />                                     {/* 上升趋势图标 */}
              +12.5%                                                 {/* 增长百分比 */}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">  {/* 垂直排列的底部信息 */}
          <div className="line-clamp-1 flex gap-2 font-medium">
            Trending up this month <IconTrendingUp className="size-4" /> {/* 本月上升趋势 */}
          </div>
          <div className="text-muted-foreground">
            Visitors for the last 6 months                          {/* 最近6个月访客数据 */}
          </div>
        </CardFooter>
      </Card>
      {/* 新客户卡片 */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>New Customers</CardDescription>           {/* 新客户 */}
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            1,234                                                    {/* 客户数量 */}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingDown />                                   {/* 下降趋势图标 */}
              -20%                                                   {/* 下降百分比 */}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Down 20% this period <IconTrendingDown className="size-4" /> {/* 本期下降20% */}
          </div>
          <div className="text-muted-foreground">
            Acquisition needs attention                              {/* 获客需要关注 */}
          </div>
        </CardFooter>
      </Card>
      {/* 活跃账户卡片 */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Accounts</CardDescription>         {/* 活跃账户 */}
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            45,678                                                   {/* 账户数量 */}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />                                     {/* 上升趋势图标 */}
              +12.5%                                                 {/* 增长百分比 */}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Strong user retention <IconTrendingUp className="size-4" /> {/* 强劲的用户留存 */}
          </div>
          <div className="text-muted-foreground">Engagement exceed targets</div> {/* 参与度超过目标 */}
        </CardFooter>
      </Card>
      {/* 增长率卡片 */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Growth Rate</CardDescription>             {/* 增长率 */}
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            4.5%                                                     {/* 增长率数值 */}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />                                     {/* 上升趋势图标 */}
              +4.5%                                                  {/* 增长百分比 */}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Steady performance increase <IconTrendingUp className="size-4" /> {/* 稳定的性能提升 */}
          </div>
          <div className="text-muted-foreground">Meets growth projections</div> {/* 符合增长预期 */}
        </CardFooter>
      </Card>
    </div>
  )
}
