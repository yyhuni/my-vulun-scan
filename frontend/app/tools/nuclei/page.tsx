"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useNucleiRepos,
  useCreateNucleiRepo,
  useDeleteNucleiRepo,
  useRefreshNucleiRepo,
  useUpdateNucleiRepo,
  type NucleiRepo,
} from "@/hooks/use-nuclei-repos"

/** 根据 last_synced_at 渲染同步状态 Badge */
function renderStatusBadge(lastSyncedAt: string | null) {
  if (lastSyncedAt) {
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">已同步</Badge>
  }
  return <Badge variant="outline">未同步</Badge>
}

/** 格式化时间显示 */
function formatDateTime(isoString: string | null) {
  if (!isoString) return null
  try {
    return new Date(isoString).toLocaleString("zh-CN")
  } catch {
    return isoString
  }
}

export default function NucleiReposPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newRepoUrl, setNewRepoUrl] = useState("")

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingRepo, setEditingRepo] = useState<NucleiRepo | null>(null)
  const [editRepoUrl, setEditRepoUrl] = useState("")

  // API Hooks
  const { data: repos, isLoading, isError } = useNucleiRepos()
  const createMutation = useCreateNucleiRepo()
  const deleteMutation = useDeleteNucleiRepo()
  const refreshMutation = useRefreshNucleiRepo()
  const updateMutation = useUpdateNucleiRepo()

  const resetCreateForm = () => {
    setNewName("")
    setNewRepoUrl("")
  }

  const resetEditForm = () => {
    setEditingRepo(null)
    setEditRepoUrl("")
  }

  const handleCreateSubmit = (event: FormEvent) => {
    event.preventDefault()
    const name = newName.trim()
    const repoUrl = newRepoUrl.trim()
    if (!name || !repoUrl) return

    createMutation.mutate(
      {
        name,
        repoUrl,
      },
      {
        onSuccess: () => {
          resetCreateForm()
          setCreateDialogOpen(false)
        },
      }
    )
  }

  const handleRefresh = (repoId: number) => {
    refreshMutation.mutate(repoId)
  }

  const handleDelete = (repoId: number, repoName: string) => {
    if (!window.confirm(`确定要删除仓库「${repoName}」吗？`)) return
    deleteMutation.mutate(repoId)
  }

  const openEditDialog = (repo: NucleiRepo) => {
    setEditingRepo(repo)
    setEditRepoUrl(repo.repoUrl || "")
    setEditDialogOpen(true)
  }

  const handleEditSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!editingRepo) return
    const repoUrl = editRepoUrl.trim()
    if (!repoUrl) return

    updateMutation.mutate(
      {
        id: editingRepo.id,
        repoUrl,
      },
      {
        onSuccess: () => {
          resetEditForm()
          setEditDialogOpen(false)
        },
      }
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nuclei 模板仓库</h1>
          <p className="text-muted-foreground mt-1">
            管理多个 Nuclei 模板 Git 仓库，每个仓库在独立路径下保存模板文件
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            新增模板仓库
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>模板仓库列表</CardTitle>
          <CardDescription>
            每个仓库对应一个 Git 远程地址和本地工作目录，点击「管理模板」进入该仓库的模板浏览页面
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-sm text-red-500">加载仓库列表失败，请稍后重试。</div>
          ) : !repos || repos.length === 0 ? (
            <div className="text-sm text-muted-foreground">暂无仓库，可在这里新增模板仓库。</div>
          ) : (
            <div className="space-y-3">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  className="flex flex-col gap-2 rounded-md border px-3 py-2 text-sm md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{repo.name}</span>
                      {renderStatusBadge(repo.lastSyncedAt)}
                    </div>
                    <div className="text-xs text-muted-foreground break-all">
                      <span className="font-medium">Git 地址：</span>
                      <span>{repo.repoUrl}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                      {repo.localPath && (
                        <span>
                          <span className="font-medium">本地路径：</span>
                          {repo.localPath}
                        </span>
                      )}
                      {repo.lastSyncedAt && (
                        <span>
                          <span className="font-medium">最后同步：</span>
                          {formatDateTime(repo.lastSyncedAt)}
                        </span>
                      )}
                    </div>
                    {repo.commitHash && (
                      <div className="text-xs text-muted-foreground mt-1 font-mono">
                        <span className="font-medium font-sans">Commit：</span>
                        {repo.commitHash}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefresh(repo.id)}
                      disabled={refreshMutation.isPending}
                    >
                      {refreshMutation.isPending ? "同步中..." : "同步"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(repo)}
                      disabled={updateMutation.isPending}
                    >
                      编辑配置
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(repo.id, repo.name)}
                      disabled={deleteMutation.isPending}
                    >
                      删除
                    </Button>
                    <Link href={`/tools/nuclei/${repo.id}/`}>
                      <Button size="sm">管理模板</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open)
        if (!open) {
          resetCreateForm()
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增 Nuclei 模板仓库</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateSubmit}>
            <div className="space-y-2">
              <Label htmlFor="nuclei-repo-name">仓库名称</Label>
              <Input
                id="nuclei-repo-name"
                type="text"
                placeholder="例如：默认 Nuclei 官方模板"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nuclei-repo-url">Git 仓库地址</Label>
              <Input
                id="nuclei-repo-url"
                type="text"
                placeholder="例如：https://github.com/projectdiscovery/nuclei-templates.git"
                value={newRepoUrl}
                onChange={(event) => setNewRepoUrl(event.target.value)}
              />
            </div>

            {/* 目前只支持公开仓库，这里不再提供认证方式和凭据配置 */}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={createMutation.isPending}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={!newName.trim() || !newRepoUrl.trim() || createMutation.isPending}
              >
                {createMutation.isPending ? "创建中..." : "确认新增"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) {
            resetEditForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑 Nuclei 仓库配置</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div className="space-y-1 text-sm text-muted-foreground">
              <span className="font-medium">仓库名称：</span>
              <span>{editingRepo?.name ?? ""}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-nuclei-repo-url">Git 仓库地址</Label>
              <Input
                id="edit-nuclei-repo-url"
                type="text"
                placeholder="例如：https://github.com/projectdiscovery/nuclei-templates.git"
                value={editRepoUrl}
                onChange={(event) => setEditRepoUrl(event.target.value)}
              />
            </div>

            {/* 编辑时也不再支持配置认证方式/凭据，仅允许修改 Git 地址 */}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={updateMutation.isPending}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={!editRepoUrl.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? "保存中..." : "保存配置"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
