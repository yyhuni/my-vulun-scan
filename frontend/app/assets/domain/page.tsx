// 导入域名管理组件
import { DomainList } from "@/components/assets/domain/domain-list"
// 导入图标
import { Globe } from "lucide-react"

/**
 * 域名管理页面
 * 资产管理下的域名管理子页面，显示域名列表和相关操作
 */
export default function DomainPage() {
  return (
    // 内容区域，包含域名管理功能
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Globe />
            域名管理
          </h2>
          <p className="text-muted-foreground">
            管理和查看系统中的所有域名信息
          </p>
        </div>
      </div>

      {/* 域名列表组件 */}
      <div className="px-4 lg:px-6">
        <DomainList />
      </div>
    </div>
  )
}
