'use client';

import WorkflowManagementList from '@/components/workflow/views/management';
import AppLayout from '@/components/layout/app-layout';

const breadcrumbItems = [
  { name: '工作流', href: '/workflow/overview' },
  { name: '工作流列表', current: true },
]

export default function WorkflowManagementPage() {
  return (
    <AppLayout breadcrumbItems={breadcrumbItems}>
      <WorkflowManagementList />
    </AppLayout>
  );
}