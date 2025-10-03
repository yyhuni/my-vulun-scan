'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import AppLayout from "@/components/layout/app-layout";
import Loading from "@/components/common/loading";

// 懒加载扫描创建组件
const ScanCreate = dynamic(
  () => import("@/components/pages/scan/create/scan-create"),
  { ssr: false }
);

const breadcrumbItems = [
  { name: "扫描", href: "/scan/overview" },
  { name: "新建扫描", current: true },
];

export default function ScanCreatePage() {
  return (
    <AppLayout breadcrumbItems={breadcrumbItems}>
      <ScanCreate />
    </AppLayout>
  );
}