"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { LogFile } from "@/types/system-log.types"

const LINE_OPTIONS = [100, 200, 500, 1000, 5000] as const

interface LogToolbarProps {
  files: LogFile[]
  selectedFile: string
  lines: number
  autoRefresh: boolean
  onFileChange: (filename: string) => void
  onLinesChange: (lines: number) => void
  onAutoRefreshChange: (enabled: boolean) => void
}

export function LogToolbar({
  files,
  selectedFile,
  lines,
  autoRefresh,
  onFileChange,
  onLinesChange,
  onAutoRefreshChange,
}: LogToolbarProps) {
  const t = useTranslations("settings.systemLogs")

  // 将文件按分类分组
  const groupedFiles = useMemo(() => {
    const systemLogs = files.filter(
      (f) => f.category === "system" || f.category === "error" || f.category === "performance"
    )
    const containerLogs = files.filter((f) => f.category === "container")
    return { systemLogs, containerLogs }
  }, [files])

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* 日志文件选择 */}
      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground whitespace-nowrap">
          {t("toolbar.logFile")}
        </Label>
        <Select value={selectedFile} onValueChange={onFileChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("toolbar.selectFile")} />
          </SelectTrigger>
          <SelectContent>
            {groupedFiles.systemLogs.length > 0 && (
              <SelectGroup>
                <SelectLabel>{t("toolbar.systemLogsGroup")}</SelectLabel>
                {groupedFiles.systemLogs.map((file) => (
                  <SelectItem key={file.filename} value={file.filename}>
                    {file.filename}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {groupedFiles.containerLogs.length > 0 && (
              <SelectGroup>
                <SelectLabel>{t("toolbar.containerLogsGroup")}</SelectLabel>
                {groupedFiles.containerLogs.map((file) => (
                  <SelectItem key={file.filename} value={file.filename}>
                    {file.filename}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* 行数选择 */}
      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground whitespace-nowrap">
          {t("toolbar.lines")}
        </Label>
        <Select value={String(lines)} onValueChange={(v) => onLinesChange(Number(v))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LINE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 自动刷新开关 */}
      <div className="flex items-center gap-2">
        <Switch
          id="auto-refresh"
          checked={autoRefresh}
          onCheckedChange={onAutoRefreshChange}
        />
        <Label
          htmlFor="auto-refresh"
          className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1.5"
        >
          {t("toolbar.autoRefresh")}
          {autoRefresh && (
            <span className="size-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </Label>
      </div>
    </div>
  )
}
