"use client"

import { useState, useEffect } from "react"
import { IconSettings, IconInfoCircle } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSystemConfig, useUpdateSystemConfig } from "@/hooks/use-system-config"

interface SystemConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SystemConfigDialog({ open, onOpenChange }: SystemConfigDialogProps) {
  const { data: config, isLoading } = useSystemConfig()
  const updateConfig = useUpdateSystemConfig()
  const [publicIp, setPublicIp] = useState("")

  // 当配置加载完成或弹窗打开时，同步数据
  useEffect(() => {
    if (config?.publicIp) {
      setPublicIp(config.publicIp)
    }
  }, [config?.publicIp, open])

  const handleSave = () => {
    updateConfig.mutate(
      { publicIp },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconSettings className="h-5 w-5" />
            Worker 系统配置
          </DialogTitle>
          <DialogDescription>
            配置远程 Worker 回调地址
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="publicIp">公网 IP 地址</Label>
            <Input
              id="publicIp"
              placeholder="192.168.1.100"
              value={publicIp}
              onChange={(e) => setPublicIp(e.target.value)}
              disabled={isLoading}
            />
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <IconInfoCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                远程 Worker 将通过此 IP 发送心跳。后端会自动拼接端口和路径。
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={updateConfig.isPending || !publicIp}>
            {updateConfig.isPending ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
