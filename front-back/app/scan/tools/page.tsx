import AppLayout from "../../../components/layout/app-layout"
import FallbackPage from "../../../components/common/fallback-page"

const breadcrumbItems = [
  { name: "扫描", href: "/scan/overview" },
  { name: "扫描工具", current: true },
]

export default function ScanToolsPage() {
  return (
    <AppLayout currentPath="/scan/tools" breadcrumbItems={breadcrumbItems}>
      <FallbackPage 
        statusCode={503} 
        title="功能开发中"
        description="扫描工具功能正在开发中，敬请期待"
      />
    </AppLayout>
  )
}
