'use client'

import React from 'react'

/**
 * 工作流历史页面
 */
export function WorkflowHistoryPage() {
  return (
    <div className="space-y-6 pb-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">执行历史</h1>
        <p className="text-gray-600 mt-2">查看工作流的执行历史记录和扫描结果</p>
      </div>
      
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">历史记录</h2>
          <p className="text-gray-600 mt-2">即将提供详细的执行历史管理</p>
          <p className="text-sm text-gray-500 mt-1">阶段四：执行监控和历史系统</p>
        </div>
      </div>
    </div>
  )
}

/**
 * 工作流模板页面
 */
export function WorkflowTemplatesPage() {
  return (
    <div className="space-y-6 pb-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">工作流模板</h1>
        <p className="text-gray-600 mt-2">选择预定义的安全工作流模板快速开始</p>
      </div>
      
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">模板库</h2>
          <p className="text-gray-600 mt-2">即将提供丰富的工作流模板</p>
          <p className="text-sm text-gray-500 mt-1">阶段三-四：模板系统开发</p>
        </div>
      </div>
    </div>
  )
}

// 重新导出核心类型和常量
export * from '@/components/workflow/lib/constants'
export * from '@/components/canvas/libs/types'

// 统一导出页面
import WorkflowManagement from './management'
import WorkflowOverview from './overview'
import WorkflowComponents from './components-list'
import AddComponent from './add-component'

// 工作流页面组件的属性类型
export interface WorkflowPageProps {
  onComponentsChange?: (components: any[]) => void
}

// 页面组件
export {
  WorkflowManagement,
  WorkflowOverview,
  WorkflowComponents,
  AddComponent,
} 