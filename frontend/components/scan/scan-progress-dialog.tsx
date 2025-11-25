"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  IconCircleCheck,
  IconLoader,
  IconClock,
  IconCircleX,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import type { ScanStage, ScanRecord, StageProgress, StageStatus } from "@/types/scan.types"

/**
 * 扫描阶段详情
 */
interface StageDetail {
  stage: ScanStage      // 阶段名称（来自 engine_config key）
  status: StageStatus
  duration?: string     // 耗时，如 "2m30s"
  detail?: string       // 额外信息，如 "发现 120 个子域名"
}

/**
 * 扫描进度数据
 */
export interface ScanProgressData {
  id: number
  targetName: string
  engineName: string
  status: string
  progress: number
  currentStage?: ScanStage
  startedAt?: string
  stages: StageDetail[]
}

interface ScanProgressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: ScanProgressData | null
}

/**
 * 阶段状态图标
 */
function StageStatusIcon({ status }: { status: StageStatus }) {
  switch (status) {
    case "completed":
      return <IconCircleCheck className="h-5 w-5 text-chart-1" />
    case "running":
      return <IconLoader className="h-5 w-5 text-chart-3 animate-spin" />
    case "failed":
      return <IconCircleX className="h-5 w-5 text-destructive" />
    case "cancelled":
      return <IconCircleX className="h-5 w-5 text-orange-500" />
    case "crashed":
      return <IconCircleX className="h-5 w-5 text-purple-500" />
    case "skipped":
      return <IconClock className="h-5 w-5 text-muted-foreground/50" />
    default:
      return <IconClock className="h-5 w-5 text-muted-foreground" />
  }
}

/**
 * 单个阶段行
 */
function StageRow({ stage }: { stage: StageDetail }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 px-4 rounded-lg transition-colors",
        stage.status === "running" && "bg-chart-3/10 border border-chart-3/20",
        stage.status === "completed" && "bg-muted/50",
        stage.status === "failed" && "bg-destructive/10",
        stage.status === "cancelled" && "bg-orange-500/10",
        stage.status === "crashed" && "bg-purple-500/10",
      )}
    >
      <div className="flex items-center gap-3">
        <StageStatusIcon status={stage.status} />
        <div>
          <span className="font-medium font-mono">{stage.stage}</span>
          {stage.detail && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {stage.detail}
            </p>
          )}
        </div>
      </div>
      
      <div className="text-right">
        {stage.status === "running" && (
          <Badge variant="outline" className="bg-chart-3/20 text-chart-3 border-chart-3/30">
            进行中
          </Badge>
        )}
        {stage.status === "completed" && stage.duration && (
          <span className="text-sm text-muted-foreground font-mono">
            {stage.duration}
          </span>
        )}
        {stage.status === "pending" && (
          <span className="text-sm text-muted-foreground">等待中</span>
        )}
        {stage.status === "failed" && (
          <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">
            失败
          </Badge>
        )}
        {stage.status === "cancelled" && (
          <Badge variant="outline" className="bg-orange-500/20 text-orange-500 border-orange-500/30">
            已取消
          </Badge>
        )}
        {stage.status === "crashed" && (
          <Badge variant="outline" className="bg-purple-500/20 text-purple-500 border-purple-500/30">
            已崩溃
          </Badge>
        )}
        {stage.status === "skipped" && (
          <span className="text-sm text-muted-foreground/50">已跳过</span>
        )}
      </div>
    </div>
  )
}

/**
 * 扫描进度弹窗
 */
export function ScanProgressDialog({
  open,
  onOpenChange,
  data,
}: ScanProgressDialogProps) {
  if (!data) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconLoader className="h-5 w-5 text-chart-3 animate-spin" />
            扫描进度
          </DialogTitle>
        </DialogHeader>

        {/* 基本信息 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">目标</span>
            <span className="font-medium">{data.targetName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">引擎</span>
            <Badge variant="secondary">{data.engineName}</Badge>
          </div>
          {data.startedAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">开始时间</span>
              <span className="font-mono text-xs">{data.startedAt}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* 总进度 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">总进度</span>
            <span className="font-mono text-chart-3">{data.progress}%</span>
          </div>
          <Progress value={data.progress} className="h-2" />
        </div>

        <Separator />

        {/* 阶段列表 */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {data.stages.map((stage) => (
            <StageRow key={stage.stage} stage={stage} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 格式化时长（秒 -> 可读字符串）
 */
function formatDuration(seconds?: number): string | undefined {
  if (!seconds) return undefined
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
}

/**
 * 从 ScanRecord 构建 ScanProgressData
 * 
 * 阶段名称直接来自 engine_config 的 key，无需映射
 * 阶段顺序按 order 字段排序，与 Flow 执行顺序一致
 */
export function buildScanProgressData(scan: ScanRecord): ScanProgressData {
  const stages: StageDetail[] = []
  
  if (scan.stageProgress) {
    // 按 order 排序后遍历
    const sortedEntries = Object.entries(scan.stageProgress)
      .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0))
    
    for (const [stageName, progress] of sortedEntries) {
      stages.push({
        stage: stageName,
        status: progress.status,
        duration: formatDuration(progress.duration),
        detail: progress.detail || progress.error || progress.reason,
      })
    }
  }
  
  return {
    id: scan.id,
    targetName: scan.targetName,
    engineName: scan.engineName,
    status: scan.status,
    progress: scan.progress,
    currentStage: scan.currentStage,
    startedAt: scan.createdAt,
    stages,
  }
}
