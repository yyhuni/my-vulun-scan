// 基础节点组件 - 所有节点的基础组件
// 参考 Dify 的节点基础设计模式

'use client'

import React from 'react'
import { Handle, Position } from '@xyflow/react'
import {
  Workflow,
  Settings,
  MoreVertical,
  Play,
  Pause,
  RotateCw,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type NodeProps,
  NodeRunningStatus,
} from '@/components/canvas/libs/types'

export interface BaseNodeProps extends NodeProps {
  children?: React.ReactNode
  className?: string
  showHandles?: boolean
  targetHandles?: Array<{
    id: string
    position: Position
    className?: string
  }>
  sourceHandles?: Array<{
    id: string
    position: Position
    className?: string
  }>
  // Dify 风格的新属性
  icon?: React.ReactNode
  iconBgColor?: string
  iconColor?: string
  subtitle?: string
  // 删除功能
  onDelete?: (nodeId: string) => void
  canDelete?: boolean
}

// 获取节点状态样式 - 采用 Dify 风格
const getNodeStatusClass = (status?: NodeRunningStatus) => {
  switch (status) {
    case NodeRunningStatus.Running:
      return 'border-blue-500/30 shadow-blue-500/20'
    case NodeRunningStatus.Succeeded:
      return 'border-green-500/30 shadow-green-500/20'
    case NodeRunningStatus.Failed:
      return 'border-red-500/30 shadow-red-500/20'
    case NodeRunningStatus.Exception:
      return 'border-orange-500/30 shadow-orange-500/20'
    case NodeRunningStatus.Waiting:
      return 'border-yellow-500/30 shadow-yellow-500/20'
    default:
      return 'border-gray-200 shadow-gray-300/20'
  }
}

// 基础节点组件 - Dify 官方风格
export function BaseNode({
  id,
  data,
  selected,
  children,
  className,
  showHandles = true,
  targetHandles = [{ id: 'target', position: Position.Left }],
  sourceHandles = [{ id: 'source', position: Position.Right }],
  icon,
  iconBgColor = 'bg-gray-500',
  iconColor = 'text-white',
  subtitle,
  onDelete,
  canDelete = true,
}: BaseNodeProps) {
  const { runningStatus, title, desc } = data

  return (
    <div
      className={cn(
        // Dify 官方尺寸和形状规范 - 缩小版本
        'relative w-[200px]', // 从240px缩小到200px
        'rounded-[12px] border-[0.5px] shadow-xs', // 从15px缩小到12px圆角
        'bg-white transition-all duration-200',
        'hover:shadow-sm',
        // 状态样式
        getNodeStatusClass(runningStatus),
        // 选中状态
        selected && 'ring-2 ring-blue-500 ring-offset-1',
        className
      )}
      data-node-id={id}
    >
      {/* 删除按钮 - 仅在选中且可删除时显示 */}
      {selected && canDelete && onDelete && (
        <div className="absolute -top-1.5 -right-1.5 z-10">
          <button
            className={cn(
              'w-5 h-5 rounded-full bg-red-500 hover:bg-red-600',
              'flex items-center justify-center',
              'shadow-sm border border-white',
              'transition-all duration-200',
              'hover:scale-110 active:scale-95'
            )}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(id)
            }}
            title="删除节点"
          >
            <Trash2 className="w-2.5 h-2.5 text-white" />
          </button>
        </div>
      )}
      {/* Dify 风格的节点头部 - 紧凑版 */}
      <div className="flex items-center px-2 pt-2 pb-1.5"> {/* 缩小边距：px-2 pt-2 pb-1.5 */}
        {/* 左侧图标 - 缩小 */}
        <div className={cn(
          'w-5 h-5 flex items-center justify-center rounded-md mr-1.5 shrink-0', // 从6x6缩小到5x5，从mr-2缩小到mr-1.5
          iconBgColor
        )}>
          <div className={cn('w-2.5 h-2.5 flex items-center justify-center', iconColor)}>
            {icon}
          </div>
        </div>

        {/* 标题区域 - 缩小字体 */}
        <div className="flex-1 min-w-0"> {/* min-w-0 确保 truncate 生效 */}
          <h3 className="text-[12px] font-medium text-gray-700 truncate"> {/* 从text-xs缩小到text-[10px] */}
            {title || '节点'}
          </h3>
        </div>
      </div>

      {/* 节点内容区域 - 缩小边距 */}
      {children && (
        <div className="px-2 pb-2"> {/* 从px-3 pb-3缩小到px-2 pb-2 */}
          {children}
        </div>
      )}

      {/* 连接点 - Dify 风格（修复连接功能） */}
      {showHandles && (
        <>
          {/* 输入连接点 - 修复连接功能 */}
          {targetHandles.map((handle) => (
            <Handle
              key={handle.id}
              id={handle.id}
              type="target"
              position={handle.position}
              style={{
                width: '16px',
                height: '16px',
                // 根据连接点位置调整其在节点边缘的确切位置
                left: handle.position === Position.Left ? '0px' : undefined,  // 左侧连接点位置
                top: handle.position === Position.Top ? '0px' : undefined,     // 顶部连接点位置
                right: handle.position === Position.Right ? '0px' : undefined, // 右侧连接点位置
                bottom: handle.position === Position.Bottom ? '0px' : undefined, // 底部连接点位置
                // 保持 React Flow 连接功能需要的基本样式
                background: 'transparent',  // 透明背景，让真实连接点元素可见
                border: 'none',             // 移除默认边框
                borderRadius: '50%',        // 保持圆形外观
                cursor: 'crosshair',        // 鼠标悬停时显示十字光标，提示可连接
              }}
              className={cn(
                'group/handle z-[1]',
                // 确保容器居中，并保持连接功能
                'flex items-center justify-center',
                // 保持连接点可交互
                '!outline-none',
                handle.className
              )}
            >
              {/* 连接点圆圈 - 真实元素 */}
              <div
                className={cn(
                  'relative w-3 h-3 rounded-full border-2 border-white',
                  'transition-all duration-200 ease-in-out',
                  // 关键：直接在元素上应用缩放，以自身中心为原点
                  'group-hover/handle:scale-150',
                  // 背景颜色
                  'bg-blue-500',
                  // 悬停时改变颜色
                  'group-hover/handle:bg-blue-500',
                  // 状态反馈
                  runningStatus === NodeRunningStatus.Succeeded && 'bg-green-500',
                  runningStatus === NodeRunningStatus.Failed && 'bg-red-500',
                  runningStatus === NodeRunningStatus.Exception && 'bg-orange-500',
                  // 确保不阻挡连接事件
                  'pointer-events-none',
                )}
                style={{
                  // 确保变换原点为中心
                  transformOrigin: 'center center',
                }}
              >
                {/* 悬停时显示的加号 */}
                <div
                  className={cn(
                    'absolute inset-0 flex items-center justify-center',
                    'text-white text-xs font-bold',
                    'opacity-0 group-hover/handle:opacity-100',
                    'transition-opacity duration-200',
                    'pointer-events-none' // 防止阻挡点击事件
                  )}
                >
                  +
                </div>
              </div>
            </Handle>
          ))}

          {/* 输出连接点 - 修复连接功能 */}
          {sourceHandles.map((handle) => (
            <Handle
              key={handle.id}
              id={handle.id}
              type="source"
              position={handle.position}
              style={{
                width: '16px',
                height: '16px',
                left: handle.position === Position.Left ? '0px' : undefined,  // 左侧连接点位置
                top: handle.position === Position.Top ? '0px' : undefined,     // 顶部连接点位置
                right: handle.position === Position.Right ? '0px' : undefined, // 右侧连接点位置
                bottom: handle.position === Position.Bottom ? '0px' : undefined, // 底部连接点位置
                // 保持 React Flow 连接功能需要的基本样式
                background: 'transparent',
                border: 'none',
                borderRadius: '50%',
                cursor: 'crosshair',
              }}
              className={cn(
                'group/handle z-[1]',
                // 确保容器居中，并保持连接功能
                'flex items-center justify-center',
                // 保持连接点可交互
                '!outline-none',
                handle.className
              )}
            >
              {/* 连接点圆圈 - 真实元素 */}
              <div
                className={cn(
                  'relative w-3 h-3 rounded-full border-2 border-white',
                  'transition-all duration-200 ease-in-out',
                  // 关键：直接在元素上应用缩放，以自身中心为原点
                  'group-hover/handle:scale-150',
                  // 背景颜色
                  'bg-blue-500',
                  // 悬停时改变颜色
                  'group-hover/handle:bg-blue-600',
                  // 状态反馈
                  runningStatus === NodeRunningStatus.Succeeded && 'bg-green-600',
                  runningStatus === NodeRunningStatus.Failed && 'bg-red-600',
                  runningStatus === NodeRunningStatus.Exception && 'bg-orange-600',
                  // 确保不阻挡连接事件
                  'pointer-events-none',
                )}
                style={{
                  // 确保变换原点为中心
                  transformOrigin: 'center center',
                }}
              >
                {/* 悬停时显示的加号 */}
                <div
                  className={cn(
                    'absolute inset-0 flex items-center justify-center',
                    'text-white text-xs font-bold',
                    'opacity-0 group-hover/handle:opacity-100',
                    'transition-opacity duration-200',
                    'pointer-events-none' // 防止阻挡点击事件
                  )}
                >
                  +
                </div>
              </div>
            </Handle>
          ))}
        </>
      )}

      {/* 运行状态指示器 - 缩小 */}
      {runningStatus === NodeRunningStatus.Running && (
        <div className="absolute top-2 right-2 w-2 h-2">
          <div className="w-full h-full border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 状态指示环 - 缩小 */}
      {runningStatus && runningStatus !== NodeRunningStatus.Running && (
        <div className={cn(
          'absolute top-2 right-2 w-2 h-2 rounded-full',
          runningStatus === NodeRunningStatus.Succeeded && 'bg-green-500',
          runningStatus === NodeRunningStatus.Failed && 'bg-red-500',
          runningStatus === NodeRunningStatus.Exception && 'bg-orange-500',
          runningStatus === NodeRunningStatus.Waiting && 'bg-yellow-500'
        )} />
      )}
    </div>
  )
}

// 节点头部组件 (保留兼容性)
export function NodeHeader({
  title,
  icon,
  status,
  className,
}: {
  title: string
  icon?: React.ReactNode
  status?: NodeRunningStatus
  className?: string
}) {
  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-2 border-b border-gray-100',
      'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 rounded-t-xl',
      'font-medium text-sm',
      className
    )}>
      <div className="flex items-center space-x-2">
        {icon && <div className="text-gray-600">{icon}</div>}
        <span className="truncate">{title}</span>
      </div>
      {status === NodeRunningStatus.Running && (
        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
  )
}

// 节点内容组件 (保留兼容性)
export function NodeContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('px-3 py-2', className)}>
      {children}
    </div>
  )
}

export default BaseNode 