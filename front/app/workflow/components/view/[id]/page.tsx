'use client'

/**
 * 工作流组件详情页面路由
 *
 * 动态路由页面，用于显示特定组件的详细信息
 * URL格式: /workflow/components/view/[id]
 * 现在重定向到统一的组件管理页面
 *
 * @author Xingra Team
 * @version 1.0.0
 */

import { useParams } from 'next/navigation'
import AppLayout from '@/components/layout/app-layout'
import AddComponent from '@/components/workflow/views/add-component'

export default function ViewComponentPage() {
  const params = useParams()
  const componentId = params.id as string

  const breadcrumbItems = [
    { name: '工作流', href: '/workflow/overview' },
    { name: '组件库管理', href: '/workflow/components' },
    { name: '查看组件', current: true },
  ]

  return (
    <AppLayout breadcrumbItems={breadcrumbItems}>
      <AddComponent />
    </AppLayout>
  );
}
