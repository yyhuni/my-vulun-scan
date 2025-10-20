"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ScanConfigFormProps {
  scanName: string
  scanType: string
  description: string
  onScanNameChange: (value: string) => void
  onScanTypeChange: (value: string) => void
  onDescriptionChange: (value: string) => void
}

/**
 * 扫描配置表单组件
 * 用于配置扫描任务的基本参数
 */
export function ScanConfigForm({
  scanName,
  scanType,
  description,
  onScanNameChange,
  onScanTypeChange,
  onDescriptionChange,
}: ScanConfigFormProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scanName">扫描名称 *</Label>
            <Input
              id="scanName"
              placeholder="例如：生产环境安全扫描"
              value={scanName}
              onChange={(e) => onScanNameChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scanType">扫描策略 *</Label>
            <Select value={scanType} onValueChange={onScanTypeChange}>
              <SelectTrigger id="scanType">
                <SelectValue placeholder="选择扫描策略" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">全量扫描</SelectItem>
                <SelectItem value="subdomain">子域名扫描</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">描述</Label>
          <Textarea
            id="description"
            placeholder="输入扫描任务的描述信息..."
            className="h-[116px] resize-none"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
