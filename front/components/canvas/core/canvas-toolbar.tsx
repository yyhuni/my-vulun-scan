/**
 * 工作流控制工具栏组件
 * 
 * 功能特性：
 * - 视图控制（缩放、适应画布）
 * - 布局控制（自动布局、清空画布）
 * - 工作流控制（开始、停止执行）
 * - 文件操作（保存工作流）
 * - 辅助功能（日志显示）
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useReactFlow } from '@xyflow/react'
import { Button } from '@/components/ui'
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  LayoutGrid, 
  Play, 
  Square, 
  Save, 
  FileText,
  Trash2
} from 'lucide-react'

export interface ToolbarProps {
  readOnly?: boolean
  onLayout?: () => void
  onLogToggle?: () => void
  onSave?: () => void
  onStart?: () => void
  onStop?: () => void
  onClear?: () => void
  workflowStatus?: 'idle' | 'running' | 'paused' | 'completed' | 'error'
}

/**
 * 工作流控制工具栏组件
 */
export function Toolbar({
  readOnly, 
  onLayout, 
  onLogToggle, 
  onSave, 
  onStart, 
  onStop, 
  onClear, 
  workflowStatus = 'idle' 
}: ToolbarProps) {
  const { setViewport, getZoom } = useReactFlow()
  const [zoom, setZoom] = useState(100)

  const updateZoom = useCallback(() => {
    const currentZoom = getZoom()
    setZoom(Math.round(currentZoom * 100))
  }, [getZoom])

  useEffect(() => {
    updateZoom()
    
    // 定时更新缩放比例
    const interval = setInterval(updateZoom, 100)
    
    return () => {
      clearInterval(interval)
    }
  }, [updateZoom])

  const handleZoomIn = () => {
    const currentZoom = getZoom()
    const newZoom = Math.min(currentZoom * 1.2, 2)
    setViewport({ x: 0, y: 0, zoom: newZoom }, { duration: 300 })
  }

  const handleZoomOut = () => {
    const currentZoom = getZoom()
    const newZoom = Math.max(currentZoom / 1.2, 0.1)
    setViewport({ x: 0, y: 0, zoom: newZoom }, { duration: 300 })
  }

  const handleFitView = () => {
    setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 })
  }

  const isRunning = workflowStatus === 'running'

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-3 nodrag nopan z-50">
      {/* 视图和布局控制组 */}
      <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-lg shadow-lg p-0.5">
        {/* 缩小按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          className="h-7 w-7 p-0 hover:bg-gray-100"
          title="缩小"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        
        {/* 缩放显示 */}
        <div className="px-2 py-1 text-xs font-medium text-gray-700 min-w-[45px] text-center bg-gray-50/80 rounded-md">
          {zoom}%
        </div>
        
        {/* 放大按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          className="h-7 w-7 p-0 hover:bg-gray-100"
          title="放大"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        
        {/* 分隔线 */}
        <div className="w-px h-4 bg-gray-200 mx-0.5" />
        
        {/* 适应画布按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFitView}
          className="h-7 w-7 p-0 hover:bg-gray-100"
          title="适应画布"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
        
        {/* 自动布局按钮 */}
        {onLayout && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLayout}
            className="h-7 w-7 p-0 hover:bg-gray-100"
            title="自动布局"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
        )}
        
        {/* 清空画布按钮 */}
        {onClear && !readOnly && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
            title="清空画布"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* 工作流控制、文件操作和辅助功能组 */}
      <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur-sm border border-gray-200/80 rounded-lg shadow-lg p-0.5">
        {/* 工作流控制 */}
        {!readOnly && (
          <>
            {/* 开始执行按钮 */}
            {onStart && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onStart}
                disabled={isRunning}
                className="h-7 w-7 p-0 hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
                title="开始执行"
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}
            
            {/* 停止执行按钮 */}
            {onStop && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onStop}
                disabled={!isRunning}
                className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                title="停止执行"
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
            )}
            
            {/* 分隔线 */}
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
          </>
        )}
        
        {/* 保存工作流按钮 */}
        {!readOnly && onSave && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
              title="保存工作流"
            >
              <Save className="h-3.5 w-3.5" />
            </Button>
            
            {/* 分隔线 */}
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
          </>
        )}
        
        {/* 日志显示/隐藏按钮 */}
        {onLogToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogToggle}
            className="h-7 w-7 p-0 hover:bg-gray-100"
            title="显示/隐藏日志"
          >
            <FileText className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

// 使用命名导出以保持一致性