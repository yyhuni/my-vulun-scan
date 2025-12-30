"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Editor, { type Monaco } from "@monaco-editor/react"
import { useColorTheme } from "@/hooks/use-color-theme"
import { useTranslations } from "next-intl"

import { Card, CardContent } from "@/components/ui/card"
import { useSystemLogs, useLogFiles } from "@/hooks/use-system-logs"
import { LogToolbar } from "./log-toolbar"

const DEFAULT_FILE = "xingrin.log"
const DEFAULT_LINES = 500

export function SystemLogsView() {
  const { currentTheme } = useColorTheme()
  const t = useTranslations("settings.systemLogs")

  // 状态管理
  const [selectedFile, setSelectedFile] = useState(DEFAULT_FILE)
  const [lines, setLines] = useState(DEFAULT_LINES)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // 获取日志文件列表
  const { data: filesData } = useLogFiles()
  const files = useMemo(() => filesData?.files ?? [], [filesData?.files])

  // 当文件列表加载完成后，如果当前选中的文件不在列表中，切换到第一个可用文件
  useEffect(() => {
    if (files.length > 0 && !files.some((f) => f.filename === selectedFile)) {
      setSelectedFile(files[0].filename)
    }
  }, [files, selectedFile])

  // 获取日志内容
  const { data: logsData } = useSystemLogs({
    file: selectedFile,
    lines,
    autoRefresh,
  })

  const content = useMemo(() => logsData?.content ?? "", [logsData?.content])

  const editorRef = useRef<Parameters<Parameters<typeof Editor>[0]['onMount']>[0] | null>(null)

  // 自动滚动到底部
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const model = editor.getModel?.()
    if (!model) return

    const lastLine = model.getLineCount?.() ?? 1
    editor.revealLine?.(lastLine)
  }, [content])

  return (
    <Card>
      <CardContent className="space-y-4">
        <LogToolbar
          files={files}
          selectedFile={selectedFile}
          lines={lines}
          autoRefresh={autoRefresh}
          onFileChange={setSelectedFile}
          onLinesChange={setLines}
          onAutoRefreshChange={setAutoRefresh}
        />
        <div className="h-[calc(100vh-300px)] min-h-[360px] rounded-lg border overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="log"
            value={content || t("noContent")}
            theme={currentTheme.isDark ? "vs-dark" : "light"}
            onMount={(editor) => {
              editorRef.current = editor
            }}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "off",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              folding: false,
              wordWrap: "off",
              renderLineHighlight: "none",
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
