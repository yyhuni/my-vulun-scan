'use client';

import WorkflowAddComponentPage from '@/components/workflow/views/add-component';
import AppLayout from '@/components/layout/app-layout';

const breadcrumbItems = [
  { name: '工作流', href: '/workflow/overview' },
  { name: '组件库管理', href: '/workflow/components' },
  { name: '添加组件', current: true },
];

export default function AddComponentPage() {
  return (
    <AppLayout breadcrumbItems={breadcrumbItems}>
      <WorkflowAddComponentPage />
    </AppLayout>
  );
}