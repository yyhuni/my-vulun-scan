"use client"

import { useEffect, useMemo, useState } from "react"
import Editor from "@monaco-editor/react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ChevronDown, ChevronRight, FileText, Folder } from "lucide-react"
import { useTheme } from "next-themes"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  useNucleiRepoTree,
  useNucleiRepoContent,
  useRefreshNucleiRepo,
  useNucleiRepo,
} from "@/hooks/use-nuclei-repos"
import type { NucleiTemplateTreeNode } from "@/types/nuclei.types"

interface FlattenedNode extends NucleiTemplateTreeNode {
  level: number
}

export default function NucleiRepoDetailPage() {
  const params = useParams()
  const repoId = params?.repoId as string

  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [expandedPaths, setExpandedPaths] = useState<string[]>([])
  const [editorValue, setEditorValue] = useState<string>("")

  const { theme } = useTheme()

  const numericRepoId = repoId ? Number(repoId) : null

  const { data: tree, isLoading, isError } = useNucleiRepoTree(numericRepoId)
  const { data: templateContent, isLoading: isLoadingContent } = useNucleiRepoContent(numericRepoId, selectedPath)
  const { data: repoDetail } = useNucleiRepo(numericRepoId)
  const refreshMutation = useRefreshNucleiRepo()

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

  useEffect(() => {
    if (!tree || tree.length === 0) return
    if (expandedPaths.length > 0) return

    const rootFolders = tree
      .filter((item) => item.type === "folder")
      .map((item) => item.path)

    if (rootFolders.length > 0) {
      setExpandedPaths(rootFolders)
    }
  }, [tree, expandedPaths])

  useEffect(() => {
    if (templateContent) {
      setEditorValue(templateContent.content)
    } else {
      setEditorValue("")
    }
  }, [templateContent?.path])

  const toggleFolder = (path: string) => {
    setExpandedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    )
  }

  const repoDisplayName = repoDetail?.name || `仓库 #${repoId}`

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nuclei 模板仓库：{repoDisplayName}</h1>
          <p className="text-muted-foreground mt-1">
            浏览该 Git 仓库中的 Nuclei 模板结构和 YAML 内容（只读）
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/tools/nuclei/">
            <Button variant="outline" size="sm">
              返回仓库列表
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => numericRepoId && refreshMutation.mutate(numericRepoId)}
            disabled={refreshMutation.isPending || !numericRepoId}
          >
            {refreshMutation.isPending ? "同步中..." : "同步"}
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
                    value={editorValue}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      readOnly: true,
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

    </div>
  )
}
