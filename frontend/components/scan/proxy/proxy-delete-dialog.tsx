"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Proxy } from "@/types/proxy.types"

interface ProxyDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proxy: Proxy | null
  onConfirm: () => void
}

/**
 * 代理删除确认对话框
 */
export function ProxyDeleteDialog({
  open,
  onOpenChange,
  proxy,
  onConfirm,
}: ProxyDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除代理？</AlertDialogTitle>
          <AlertDialogDescription>
            您确定要删除代理 <strong>{proxy?.name}</strong> 吗？
            <br />
            此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
