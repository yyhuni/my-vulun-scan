import AppLayout from "../../../components/layout/app-layout"
import FallbackPage from "../../../components/common/fallback-page"

const breadcrumbItems = [
  { name: "扫描", href: "/scan/overview" },
  { name: "扫描历史", current: true },
]

export default function ScanHistoryPage() {
  return (
    <AppLayout breadcrumbItems={breadcrumbItems}>
      <FallbackPage 
        statusCode={503} 
        title="功能开发中"
        description="扫描历史功能正在开发中，敬请期待"
      />
    </AppLayout>
  )
}
