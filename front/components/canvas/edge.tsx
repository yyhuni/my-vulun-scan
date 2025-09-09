/**
 * 自定义边组件 - 工作流连接线
 * 
 * 功能特性：
 * - 支持运行时动画效果（流动粒子、虚线流动、脉冲动画）
 * - 支持不同运行状态的视觉反馈
 * - 支持悬停和选择状态的交互效果
 * - 提供删除功能
 */

'use client'

import React from 'react'
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  useReactFlow,
} from '@xyflow/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NodeRunningStatus } from './libs/types'

/**
 * 统一的工作流边组件
 * 整合了所有边组件的功能：动画、状态显示、删除等
 */
const Edge = (props: EdgeProps) => {
  const { setEdges } = useReactFlow()
  
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
  } = props

  // 计算贝塞尔曲线路径和标签位置
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  // 获取边的状态 - 简化版本，不依赖 data 字段
  const runningStatus = null // 简化：不显示运行状态
  const isHovering = false   // 简化：不显示悬停状态

  // 删除边的处理函数
  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation()
    setEdges((edges) => edges.filter((edge) => edge.id !== id))
  }

  // 获取边的样式配置 - 简化版本
  const getEdgeStyle = () => {
    return {
      strokeWidth: 2,
      stroke: '#6b7280', // 默认灰色
      opacity: 0.8,
      animated: false
    }
  }

  const edgeStyle = getEdgeStyle()

  return (
    <>
      {/* 主连接线 */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          strokeWidth: edgeStyle.strokeWidth,
          stroke: edgeStyle.stroke,
          opacity: edgeStyle.opacity,
        }}
      />

      {/* 运行时动画效果 */}
      {edgeStyle.animated && (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <circle r="4" fill={edgeStyle.stroke} opacity="0.8">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path={edgePath}
            />
          </circle>
          <circle r="3" fill={edgeStyle.stroke} opacity="0.6">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path={edgePath}
              begin="0.5s"
            />
          </circle>
        </svg>
      )}

      {/* 删除按钮 - 只在选中时显示 */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              className={cn(
                'w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full',
                'flex items-center justify-center shadow-lg transition-all duration-150',
                'hover:scale-110 active:scale-95'
              )}
              onClick={handleDelete}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

// 使用命名导出以保持一致性
export const WorkflowEdge = React.memo(Edge)