'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import AppLayout from "../../../components/layout/app-layout"
import Loading from "../../../components/common/loading"

// 懒加载组织列表组件
const OrganizationList = dynamic(
  () => import("../../../components/pages/assets/organizations/organization-list"),
  { ssr: false }
);

const breadcrumbItems = [
  { name: "资产管理", href: "/assets/overview" },
  { name: "组织列表", current: true },
]

export default function OrganizationsPage() {
  return (
    <AppLayout breadcrumbItems={breadcrumbItems}>
      <OrganizationList />
    </AppLayout>
  )
}
