"use client"

import { useState } from "react"
import {
  IconPlus,
  IconRefresh,
  IconServer,
  IconTerminal2,
  IconTrash,
  IconEdit,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useWorkers, useDeleteWorker } from "@/hooks/use-workers"
import type { WorkerNode, WorkerStatus } from "@/types/worker.types"
import { WORKER_STATUS_CONFIG } from "@/types/worker.types"
import { WorkerDialog } from "./worker-dialog"
import { DeployTerminalDialog } from "./deploy-terminal-dialog"

function StatusBadge({ status }: { status: WorkerStatus }) {
  const config = WORKER_STATUS_CONFIG[status] || { label: status, variant: 'secondary' as const }
  return (
    <Badge variant={config.variant} className="capitalize">
      {status === 'installing' && <span className="mr-1 h-2 w-2 animate-pulse rounded-full bg-current" />}
      {status === 'online' && <span className="mr-1 h-2 w-2 rounded-full bg-green-500" />}
      {config.label}
    </Badge>
  )
}

export function WorkerList() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deployDialogOpen, setDeployDialogOpen] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<WorkerNode | null>(null)
  const [workerToDeploy, setWorkerToDeploy] = useState<WorkerNode | null>(null)
  const [workerToDelete, setWorkerToDelete] = useState<WorkerNode | null>(null)

  const { data, isLoading, refetch } = useWorkers(page, pageSize)
  const deleteWorker = useDeleteWorker()

  const handleAdd = () => {
    setSelectedWorker(null)
    setWorkerDialogOpen(true)
  }

  const handleEdit = (worker: WorkerNode) => {
    setSelectedWorker(worker)
    setWorkerDialogOpen(true)
  }

  const handleManage = (worker: WorkerNode) => {
    setWorkerToDeploy(worker)
    setDeployDialogOpen(true)
  }

  const handleDeleteClick = (worker: WorkerNode) => {
    setWorkerToDelete(worker)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (workerToDelete) {
      deleteWorker.mutate(workerToDelete.id)
      setDeleteDialogOpen(false)
      setWorkerToDelete(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconServer className="h-5 w-5" />
              Worker 节点
            </CardTitle>
            <CardDescription>管理分布式扫描节点，支持远程部署和监控</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <IconRefresh className="mr-1 h-4 w-4" />刷新
            </Button>
            <Button size="sm" onClick={handleAdd}>
              <IconPlus className="mr-1 h-4 w-4" />添加节点
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : data?.results?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <IconServer className="mb-4 h-12 w-12 opacity-50" />
            <p className="text-lg font-medium">暂无 Worker 节点</p>
            <p className="text-sm">点击"添加节点"开始配置分布式扫描</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>IP 地址</TableHead>
                <TableHead>SSH 端口</TableHead>
                <TableHead>用户名</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results?.map((worker: WorkerNode) => (
                <TableRow key={worker.id}>
                  <TableCell className="font-medium">{worker.name}</TableCell>
                  <TableCell className="font-mono text-sm">{worker.ipAddress}</TableCell>
                  <TableCell>{worker.sshPort}</TableCell>
                  <TableCell>{worker.username}</TableCell>
                  <TableCell><StatusBadge status={worker.status} /></TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(worker.createdAt).toLocaleString('zh-CN')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleManage(worker)} title="管理节点">
                        <IconTerminal2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(worker)} title="编辑">
                        <IconEdit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(worker)} title="删除" disabled={deleteWorker.isPending}>
                        <IconTrash className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <WorkerDialog 
        open={workerDialogOpen} 
        onOpenChange={setWorkerDialogOpen} 
        worker={selectedWorker}
      />
      <DeployTerminalDialog
        open={deployDialogOpen}
        onOpenChange={setDeployDialogOpen}
        worker={workerToDeploy}
        onDeployComplete={() => refetch()}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>确定要删除 Worker 节点 "{workerToDelete?.name}" 吗？此操作不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
