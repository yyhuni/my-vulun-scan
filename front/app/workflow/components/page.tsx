'use client';

import WorkflowComponentsList from '@/components/workflow/views/components-list';
import AppLayout from '@/components/layout/app-layout';

const breadcrumbItems = [
  { name: '工作流', href: '/workflow/overview' },
  { name: '组件库管理', current: true },
];

export default function WorkflowComponentsPage() {
  return (
    <AppLayout breadcrumbItems={breadcrumbItems}>
      <WorkflowComponentsList />
    </AppLayout>
  );
}