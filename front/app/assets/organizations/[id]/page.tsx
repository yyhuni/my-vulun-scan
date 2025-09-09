import AppLayout from "../../../../components/layout/app-layout"
import OrganizationDetail from "../../../../components/pages/assets/organizations/organization-detail"

interface OrganizationDetailPageProps {
  params: Promise<{
    id: string
  }>
}

const breadcrumbItems = [
  { name: "资产管理", href: "/assets/overview" },
  { name: "组织列表", href: "/assets/organizations" },
  { name: "组织详情", current: true },
]

export default async function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const { id: organizationId } = await params

  return (
    <AppLayout breadcrumbItems={breadcrumbItems}>
      <OrganizationDetail organizationId={organizationId} />
    </AppLayout>
  )
}