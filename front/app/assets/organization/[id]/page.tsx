// 导入必要的组件
import { Button } from "@/components/ui/button"
import { ArrowLeft, Building2 } from "lucide-react"

/**
 * 组织详情页面
 * 显示单个组织的详细信息
 * 
 * @param params - 路由参数，包含组织ID
 */
export default function OrganizationDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    // 内容区域
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          {/* 返回按钮 */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
          
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              组织详情
            </h2>
            <p className="text-muted-foreground">
              组织ID: {params.id}
            </p>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="px-4 lg:px-6">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="space-y-4">
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">组织详情页面</h3>
              <p className="text-muted-foreground mb-4">
                这里将显示ID为 <code className="bg-muted px-2 py-1 rounded">{params.id}</code> 的组织详细信息
              </p>
              <p className="text-sm text-muted-foreground">
                功能开发中，敬请期待...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
