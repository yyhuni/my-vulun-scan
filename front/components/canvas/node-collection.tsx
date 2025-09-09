'use client'

import React from 'react'
import { Position } from '@xyflow/react'
import { Play, Square, Settings } from 'lucide-react'
import { BaseNode } from './base-node'
import type { NodeProps, WorkflowStartNodeType, WorkflowEndNodeType, CustomToolNodeType } from '@/components/canvas/libs/types'

/**
 * 工作流开始节点
 */
export const WorkflowStartNode: React.FC<NodeProps<WorkflowStartNodeType> & { title?: string }> = ({
  id,
  data,
  selected,
  title
}) => {
  return (
    <BaseNode
      id={id}
      data={{
        ...data,
        title: title || data.title || '开始',
      }}
      selected={selected}
      targetHandles={[]}
      sourceHandles={[{ id: 'source', position: Position.Right }]}
      icon={<Play className="w-3 h-3" />}
      iconBgColor="bg-green-500"
      iconColor="text-white"
      onDelete={(data as any).onDelete}
      canDelete={(data as any).canDelete}
    >
      <div className="space-y-1.5">
        {data.workflowConfig && (
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5 text-[11px]">
              <span className="text-gray-500">工作流:</span>
              <span className="font-medium text-gray-700 truncate">{data.workflowConfig.name}</span>
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  )
}

/**
 * 工作流结束节点
 */
export const WorkflowEndNode: React.FC<NodeProps<WorkflowEndNodeType> & { title?: string }> = ({
  id,
  data,
  selected,
  title
}) => {
  return (
    <BaseNode
      id={id}
      data={{
        ...data,
        title: title || data.title || '结束',
      }}
      selected={selected}
      targetHandles={[{ id: 'target', position: Position.Left }]}
      sourceHandles={[]}
      icon={<Square className="w-3 h-3" />}
      iconBgColor="bg-red-500"
      iconColor="text-white"
      onDelete={(data as any).onDelete}
      canDelete={(data as any).canDelete}
    >
      <div className="space-y-1.5">
        {data.output_config && (
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5 text-[11px]">
              <span className="text-gray-500">保存结果:</span>
              <span className="font-medium text-gray-700 truncate">{data.output_config.save_results ? '是' : '否'}</span>
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  )
}

/**
 * 自定义工具节点
 */
export const CustomToolNode: React.FC<NodeProps<CustomToolNodeType> & { title?: string }> = ({
  id,
  data,
  selected,
  title
}) => {
  return (
    <BaseNode
      id={id}
      data={{
        ...data,
        title: title || data.title || '自定义工具',
      }}
      selected={selected}
      targetHandles={[{ id: 'target', position: Position.Left }]}
      sourceHandles={[{ id: 'source', position: Position.Right }]}
      icon={<Settings className="w-3 h-3" />}
      iconBgColor="bg-blue-500"
      iconColor="text-white"
      onDelete={(data as any).onDelete}
      canDelete={(data as any).canDelete}
    >
      <div className="space-y-1.5">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-1.5 text-[11px]">
            <span className="text-gray-500">分类:</span>
            <span className="font-medium text-gray-700 truncate">{data.category}</span>
          </div>
          <div className="text-[10px] text-gray-600 line-clamp-2">
            {data.command_template || data.commandTemplate}
          </div>
        </div>
      </div>
    </BaseNode>
  )
}

// 导出默认组件映射
export const WorkflowNodes = {
  WorkflowStartNode: React.memo(WorkflowStartNode),
  WorkflowEndNode: React.memo(WorkflowEndNode),
  CustomToolNode: React.memo(CustomToolNode),
} 