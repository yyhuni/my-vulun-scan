import { OpensourceToolsList } from "@/components/tools/config/opensource-tools-list"

/**
 * 开源工具页面
 * 展示和管理开源扫描工具
 */
export default function OpensourceToolsPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <OpensourceToolsList />
    </div>
  )
}
