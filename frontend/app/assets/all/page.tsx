import { AllAssetsDetailView } from "@/components/assets/all/all-assets-detail-view"
import { Database } from "lucide-react"

export default function AllAssetsPage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Database />
            所有资产
          </h2>
          <p className="text-muted-foreground">
            管理系统中的所有资产信息
          </p>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="px-4 lg:px-6">
        <AllAssetsDetailView />
      </div>
    </div>
  )
}
