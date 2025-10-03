'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import AppLayout from "@/components/layout/app-layout"
import Loading from "@/components/common/loading"

// 懒加载仪表板组件
const Dashboard = dynamic(
  () => import("@/components/pages/dashboard/dashboard"),
  { ssr: false }
)

const breadcrumbItems = [
  { name: "仪表盘", current: true },
];

export default function Page() {
  return (
    <AppLayout
      breadcrumbItems={breadcrumbItems}
    >
      <Dashboard />
    </AppLayout>
  )
}
