import { CustomToolsList } from "@/components/tools/config/custom-tools-list"

/**
 * 自定义工具页面
 * 展示和管理自定义扫描脚本和工具
 */
export default function CustomToolsPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <CustomToolsList />
    </div>
  )
}
