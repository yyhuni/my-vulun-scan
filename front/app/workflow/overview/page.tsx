'use client';

import AppLayout from '@/components/layout/app-layout'
import { WorkflowOverview } from '@/components/workflow/views/page-exports'

export default function OverviewPage() {
  const breadcrumbItems = [
    { name: '工作流', href: '/workflow/overview' },
    { name: '工作流概况', current: true }
  ];

  return (
    <AppLayout
      breadcrumbItems={breadcrumbItems}
    >
      <WorkflowOverview />
    </AppLayout>
  );
}