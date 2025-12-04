"use client"

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import Editor from "@monaco-editor/react"
import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react"
import { useTheme } from "next-themes"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { useNucleiTemplateTree, useNucleiTemplateContent, useRefreshNucleiTemplates, useUploadNucleiTemplate } from "@/hooks/use-nuclei-templates"
import type { NucleiTemplateTreeNode, NucleiTemplateScope } from "@/types/nuclei.types"

interface FlattenedNode extends NucleiTemplateTreeNode {
  level: number
}

export default function NucleiTemplatesPage() {
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadScope, setUploadScope] = useState<NucleiTemplateScope>("custom")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [expandedPaths, setExpandedPaths] = useState<string[]>(["custom", "public"])

  const { theme } = useTheme()

  const { data: tree, isLoading, isError } = useNucleiTemplateTree()
  const { data: templateContent, isLoading: isLoadingContent } = useNucleiTemplateContent(selectedPath)

  const refreshMutation = useRefreshNucleiTemplates()
  const uploadMutation = useUploadNucleiTemplate()

  const nodes: FlattenedNode[] = useMemo(() => {
    const result: FlattenedNode[] = []
    const expandedSet = new Set(expandedPaths)

    const visit = (items: NucleiTemplateTreeNode[] | undefined, level: number) => {
      if (!items) return
      for (const item of items) {
        const isFolder = item.type === "folder"
        const isFile = item.type === "file"
        const isTemplateFile =
          isFile && (item.name.endsWith(".yaml") || item.name.endsWith(".yml"))

        if (!isFolder && !isTemplateFile) {
          continue
        }

        result.push({ ...item, level })

        if (isFolder && item.children && item.children.length > 0 && expandedSet.has(item.path)) {
          visit(item.children, level + 1)
        }
      }
    }

    visit(tree, 0)
    return result
  }, [tree, expandedPaths])

  const toggleFolder = (path: string) => {
    setExpandedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    )
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setUploadFile(file)
  }

  const handleUploadSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!uploadFile) {
      return
    }

    uploadMutation.mutate(
      {
        scope: uploadScope,
        file: uploadFile,
      },
      {
        onSuccess: () => {
          setUploadDialogOpen(false)
          setUploadFile(null)
        },
      }
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nuclei 模板</h1>
          <p className="text-muted-foreground mt-1">
            浏览本地 Nuclei 模板目录结构，并查看单个模板的 YAML 内容
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending ? "更新中..." : "更新模板"}
          </Button>
          <Button
            size="sm"
            onClick={() => setUploadDialogOpen(true)}
            disabled={uploadMutation.isPending}
          >
            上传模板
          </Button>
        </div>
      </div>

      <div className="flex gap-4 md:gap-6">
        <Card className="w-64 md:w-80 flex-shrink-0">
          <CardHeader>
            <CardTitle className="text-base">模板目录</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[480px]">
              <div className="px-3 py-2 space-y-1 text-sm">
                {isLoading ? (
                  <div className="text-muted-foreground text-xs px-2 py-1">正在加载目录...</div>
                ) : isError || nodes.length === 0 ? (
                  <div className="text-muted-foreground text-xs px-2 py-1">暂无模板或加载失败。</div>
                ) : (
                  nodes.map((node) => {
                    const isFolder = node.type === "folder"
                    const isFile = node.type === "file"
                    const isActive = isFile && node.path === selectedPath
                    const isExpanded = isFolder && expandedPaths.includes(node.path)

                    return (
                      <button
                        key={node.path}
                        type="button"
                        onClick={() => {
                          if (isFolder) {
                            toggleFolder(node.path)
                          } else if (isFile) {
                            setSelectedPath(node.path)
                          }
                        }}
                        className={`flex w-full items-center gap-1 rounded px-2 py-1 text-left ${
                          isFolder
                            ? "cursor-pointer hover:bg-accent/60 text-foreground font-semibold"
                            : "cursor-pointer hover:bg-accent"
                        } ${isActive ? "bg-accent text-accent-foreground" : ""}`}
                        style={{ paddingLeft: 8 + node.level * 12 }}
                      >
                        {isFolder ? (
                          <span className="flex items-center gap-1">
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            <Folder className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                        <span className="truncate flex-1">{node.name}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="flex-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">{templateContent?.name ?? "模板内容"}</CardTitle>
              {templateContent?.path && (
                <p className="text-xs text-muted-foreground break-all mt-1">{templateContent.path}</p>
              )}
            </CardHeader>
            <CardContent className="h-[520px] flex flex-col">
              {!selectedPath ? (
                <div className="text-sm text-muted-foreground">在左侧选择一个模板文件以查看内容。</div>
              ) : isLoadingContent && !templateContent ? (
                <div className="text-sm text-muted-foreground">正在加载模板内容...</div>
              ) : templateContent ? (
                <div className="flex-1 border rounded-md overflow-hidden">
                  <Editor
                    height="100%"
                    defaultLanguage="yaml"
                    value={templateContent.content}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                    theme={theme === "dark" ? "vs-dark" : "light"}
                  />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">模板内容加载失败。</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传 Nuclei 模板</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUploadSubmit}>
            <div className="space-y-2">
              <Label>上传路径</Label>
              <RadioGroup
                value={uploadScope}
                onValueChange={(value) => setUploadScope(value as NucleiTemplateScope)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="scope-custom" />
                  <Label htmlFor="scope-custom">自定义模板目录</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="scope-public" />
                  <Label htmlFor="scope-public">公共模板目录</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-file">模板文件</Label>
              <Input
                id="template-file"
                type="file"
                accept=".yaml,.yml"
                onChange={handleFileChange}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadDialogOpen(false)}
                disabled={uploadMutation.isPending}
              >
                取消
              </Button>
              <Button type="submit" disabled={!uploadFile || uploadMutation.isPending}>
                {uploadMutation.isPending ? "上传中..." : "确认上传"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

