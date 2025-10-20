// 导入交互式区域图表组件
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
// 导入数据表格组件
import { DataTable } from "@/components/data-table"
// 导入卡片区域组件
import { SectionCards } from "@/components/section-cards"

// 导入仪表板数据
import data from "./data.json"

/**
 * 仪表板页面组件
 * 这是应用的主要仪表板页面,包含卡片、图表和数据表格
 * 布局结构已移至根布局组件中
 */
export default function Page() {
  return (
    // 内容区域,包含卡片、图表和数据表格
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* 卡片区域组件 */}
      <SectionCards />

      {/* 图表区域,带有水平内边距 */}
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>

      {/* 数据表格组件,传入 JSON 数据 */}
      <DataTable data={data} />
    </div>
  )
}
