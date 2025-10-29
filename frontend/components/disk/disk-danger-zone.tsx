"use client"

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useDeleteAllScanResults, useDeleteAllScreenshots } from '@/hooks/use-disk'
import { IconTrash } from '@tabler/icons-react'

export function DiskDangerZone() {
  const delResults = useDeleteAllScanResults()
  const delScreens = useDeleteAllScreenshots()

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-destructive">危险操作</CardTitle>
        <CardDescription>以下操作不可撤销，请谨慎执行。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-medium">删除所有扫描结果</div>
            <div className="text-sm text-muted-foreground">清空历史扫描记录及相关结构化数据。</div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={delResults.isPending}>
                <IconTrash />
                {delResults.isPending ? '处理中...' : 'Delete all scan results'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除所有扫描结果？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作将永久删除所有扫描结果，且无法恢复。建议先备份重要数据。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={delResults.isPending}>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => delResults.mutate()} disabled={delResults.isPending}>
                  确认删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-medium">删除所有截图</div>
            <div className="text-sm text-muted-foreground">清空扫描产生的网页截图等大文件。</div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={delScreens.isPending}>
                <IconTrash />
                {delScreens.isPending ? '处理中...' : 'Delete all screenshots'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除所有截图？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作将永久删除所有截图文件，且无法恢复。建议先备份重要文件。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={delScreens.isPending}>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => delScreens.mutate()} disabled={delScreens.isPending}>
                  确认删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
