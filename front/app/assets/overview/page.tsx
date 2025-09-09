import AppLayout from "../../../components/layout/app-layout"
import AssetsOverview from "../../../components/pages/assets/overview/assets-overview"

const breadcrumbItems = [
  { name: "资产管理", href: "/assets/overview" },
  { name: "资产概况", current: true },
]

export default function AssetsOverviewPage() {
  return (
    <AppLayout breadcrumbItems={breadcrumbItems}>
      <AssetsOverview />
    </AppLayout>
  )
}
