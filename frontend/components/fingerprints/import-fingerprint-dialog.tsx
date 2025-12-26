"use client"

import React, { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/dropzone"
import { useImportEholeFingerprints } from "@/hooks/use-fingerprints"

interface ImportFingerprintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ImportFingerprintDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportFingerprintDialogProps) {
  const [files, setFiles] = useState<File[]>([])
  const importMutation = useImportEholeFingerprints()

  const handleDrop = (acceptedFiles: File[]) => {
    setFiles(acceptedFiles)
  }

  const handleImport = async () => {
    if (files.length === 0) {
      toast.error("请先选择文件")
      return
    }

    const file = files[0]

    // 前端基础校验
    try {
      const text = await file.text()
      const json = JSON.parse(text)

      if (!json.fingerprint) {
        toast.error("无效的 EHole 格式：缺少 fingerprint 字段")
        return
      }

      if (!Array.isArray(json.fingerprint)) {
        toast.error("无效的 EHole 格式：fingerprint 必须是数组")
        return
      }

      if (json.fingerprint.length === 0) {
        toast.error("指纹数据为空")
        return
      }

      // 检查第一条数据的基本字段
      const first = json.fingerprint[0]
      if (!first.cms || !first.keyword) {
        toast.error("无效的 EHole 格式：指纹缺少必要字段 (cms, keyword)")
        return
      }
    } catch (e) {
      toast.error("无效的 JSON 文件")
      return
    }

    // 校验通过，提交到后端
    try {
      const result = await importMutation.mutateAsync(file)
      toast.success(`导入成功：创建 ${result.created} 条，失败 ${result.failed} 条`)
      setFiles([])
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message || "导入失败")
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setFiles([])
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>导入指纹</DialogTitle>
          <DialogDescription>
            上传 EHole 格式的 JSON 指纹文件
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Dropzone
            src={files}
            onDrop={handleDrop}
            accept={{ "application/json": [".json"] }}
            maxFiles={1}
            maxSize={50 * 1024 * 1024}  // 50MB
            onError={(error) => toast.error(error.message)}
          >
            <DropzoneEmptyState />
            <DropzoneContent />
          </Dropzone>

          <p className="text-xs text-muted-foreground mt-3">
            支持 EHole 格式的 JSON 文件，格式如：{" "}
            <code className="bg-muted px-1 rounded">
              {`{"fingerprint": [...]}`}
            </code>
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={files.length === 0 || importMutation.isPending}
          >
            {importMutation.isPending ? "导入中..." : "导入"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
