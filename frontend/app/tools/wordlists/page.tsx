"use client"

import { useState, type FormEvent, ChangeEvent } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useWordlists, useUploadWordlist, useDeleteWordlist } from "@/hooks/use-wordlists"

export default function WordlistsPage() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const { data, isLoading } = useWordlists({ page: 1, pageSize: 20 })
  const uploadMutation = useUploadWordlist()
  const deleteMutation = useDeleteWordlist()

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null
    setFile(selectedFile)
    if (selectedFile && !name) {
      setName(selectedFile.name)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!name || !file) {
      return
    }

    uploadMutation.mutate({
      name,
      description: description || undefined,
      file,
    })
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div>
        <h1 className="text-3xl font-bold">字典管理</h1>
        <p className="text-muted-foreground mt-1">
          管理目录扫描等功能使用的字典文件，所有 Worker 会按需从后端拉取最新版本
        </p>
      </div>

      {/* 上传字典 */}
      <Card>
        <CardHeader>
          <CardTitle>上传字典</CardTitle>
          <CardDescription>
            支持通过前端上传字典文件，后端保存后由各个 Worker 按需下载使用
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">名称</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：常用目录字典"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">字典文件</label>
                <Input type="file" accept=".txt" onChange={handleFileChange} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">描述（可选）</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例如：基于 dirsearch 的常用路径字典"
                rows={3}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? "上传中..." : "上传字典"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 字典列表 */}
      <Card>
        <CardHeader>
          <CardTitle>字典列表</CardTitle>
          <CardDescription>查看已上传的字典，并在引擎配置中引用相应的字典名称或 ID</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">正在加载字典列表...</div>
          ) : !data || data.results.length === 0 ? (
            <div className="text-sm text-muted-foreground">暂无字典，请先上传。</div>
          ) : (
            <div className="space-y-2">
              {data.results.map((wordlist) => (
                <div
                  key={wordlist.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium">{wordlist.name}</div>
                    {wordlist.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {wordlist.description}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground flex gap-3 mt-1">
                      {wordlist.lineCount !== undefined && (
                        <span>行数: {wordlist.lineCount}</span>
                      )}
                      {wordlist.fileSize !== undefined && (
                        <span>大小: {(wordlist.fileSize / 1024).toFixed(1)} KB</span>
                      )}
                      <span>ID: {wordlist.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(wordlist.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
